import type { TemplateNode } from '@yukilabs/agnostic-ui-core';
import { type ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  LayoutList,
  Play,
  Rocket,
  Save,
} from 'lucide-react';

import { BuilderApiError } from '../api/client';
import type { ArtifactSummary, ArtifactVersion } from '../api/types';
import { useBuilderClient } from '../api/useBuilderClient';
import { useAuth } from '../auth/AuthContext';
import { canPublish } from '../auth/roles';
import { VersionsTable } from '@/components/VersionsTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/i18n/i18n';

import { NodeInspector } from './NodeInspector';
import { Palette } from './Palette';
import { ScreenCanvas } from './ScreenCanvas';
import { type CanvasContext, NEW_MIME, PATH_MIME } from './canvasRegistry';
import {
  type NodePath,
  buildPathIndex,
  childrenOf,
  getNodeAt,
  insertNodeAt,
  moveNode,
  parsePath,
  pathToString,
  removeNodeAt,
  updateNodeAt,
} from './nodePath';
import { type ScreenDraft, emptyScreen, validateScreen } from './screenModel';
import { CONTAINER_TYPES, emptyNode } from './screenVocabulary';
import { ScreenPreviewPanel } from '../preview/ScreenPreviewPanel';
import { SimulatePanel } from '../preview/SimulatePanel';
import { ProposePanel } from '@/components/ProposePanel';
import { ScreenIntentReview } from './ScreenIntentReview';

function describeError(caught: unknown): string {
  if (caught instanceof BuilderApiError) {
    return caught.detail === undefined
      ? `Failed: ${caught.code}`
      : `Failed: ${caught.code} — ${caught.detail}`;
  }
  return caught instanceof Error ? caught.message : 'Unexpected error';
}

/**
 * Editor de telas SDUI (K1) — mesmo esqueleto do FlowEditorPage: toolbar com
 * save/publish (gated por papel), tabs Design/Preview, validação client-side pelo
 * ScreenDefSchema e histórico de versões. No K1 o tab Design edita metadados +
 * o `root` como JSON; o canvas WYSIWYG chega no K2.
 */
export function ScreenEditorPage(): ReactElement {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const client = useBuilderClient();
  const { token } = useAuth();
  const mayPublish = canPublish(token);
  const { t } = useI18n();

  const [draft, setDraft] = useState<ScreenDraft | null>(null);
  const [versions, setVersions] = useState<ArtifactVersion[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('design');
  const [flows, setFlows] = useState<ArtifactSummary[]>([]);
  const [rootText, setRootText] = useState('');
  const [rootError, setRootError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const refreshVersions = useCallback(async () => {
    setVersions(await client.listVersions('screen', slug));
  }, [client, slug]);

  /** Muta o `root` (via ops imutáveis) e ressincroniza o JSON de escape. */
  const mutateRoot = useCallback((fn: (root: TemplateNode) => TemplateNode): void => {
    setDraft((current) => {
      if (current === null) return current;
      const root = fn(current.root as TemplateNode);
      setRootText(JSON.stringify(root, null, 2));
      setRootError(null);
      return { ...current, root };
    });
  }, []);

  const handleSelect = useCallback((path: string | null): void => setSelectedPath(path), []);
  const handleRemove = useCallback(
    (path: string): void => {
      mutateRoot((root) => removeNodeAt(root, parsePath(path)));
      setSelectedPath(null);
    },
    [mutateRoot],
  );
  const handlePatchProps = useCallback(
    (path: string, props: Record<string, unknown>): void =>
      mutateRoot((root) => updateNodeAt(root, parsePath(path), (node) => ({ ...node, props }))),
    [mutateRoot],
  );
  const handlePatchNode = useCallback(
    (path: string, patch: Partial<TemplateNode>): void =>
      mutateRoot((root) => updateNodeAt(root, parsePath(path), (node) => ({ ...node, ...patch }))),
    [mutateRoot],
  );
  const handleDrop = useCallback(
    (data: DataTransfer, parentPath: string, index: number): void => {
      const parent = parsePath(parentPath);
      const newType = data.getData(NEW_MIME);
      if (newType !== '') {
        const node = emptyNode(newType);
        if (node !== undefined) {
          mutateRoot((root) => insertNodeAt(root, parent, index, node));
          setSelectedPath(pathToString([...parent, index]));
        }
        return;
      }
      const fromStr = data.getData(PATH_MIME);
      if (fromStr !== '') {
        const from = parsePath(fromStr);
        mutateRoot((root) => {
          const moved = getNodeAt(root, from); // mesma ref é reinserida por moveNode
          const next = moveNode(root, from, parent, index);
          // path exato do nó movido (moveNode ajusta índices) — sem replicar a matemática
          setSelectedPath(moved !== undefined ? (buildPathIndex(next).get(moved) ?? null) : null);
          return next;
        });
      }
    },
    [mutateRoot],
  );
  const handleAdd = useCallback(
    (type: string): void => {
      const node = emptyNode(type);
      if (node === undefined) return;
      mutateRoot((root) => {
        let parentPath: NodePath = [];
        if (selectedPath !== null) {
          const selNode = getNodeAt(root, parsePath(selectedPath));
          parentPath =
            selNode !== undefined && CONTAINER_TYPES.has(selNode.type)
              ? parsePath(selectedPath)
              : parsePath(selectedPath).slice(0, -1);
        }
        const parent = getNodeAt(root, parentPath);
        const index = parent !== undefined ? childrenOf(parent).length : 0;
        setSelectedPath(pathToString([...parentPath, index]));
        return insertNodeAt(root, parentPath, index, node);
      });
    },
    [mutateRoot, selectedPath],
  );

  const rootNode = draft?.root as TemplateNode | undefined;
  const pathIndex = useMemo(
    () => (rootNode ? buildPathIndex(rootNode) : new WeakMap<TemplateNode, string>()),
    [rootNode],
  );
  const canvasCtx = useMemo<CanvasContext>(
    () => ({
      pathIndex,
      selectedPath,
      onSelect: handleSelect,
      onRemove: handleRemove,
      onDrop: handleDrop,
    }),
    [pathIndex, selectedPath, handleSelect, handleRemove, handleDrop],
  );

  useEffect(() => {
    let active = true;
    setStatus('loading');
    Promise.all([client.listVersions('screen', slug), client.listArtifacts('flow')])
      .then(([loaded, flowList]) => {
        if (!active) return;
        const initial = (loaded[0]?.body as ScreenDraft | undefined) ?? emptyScreen(slug);
        setVersions(loaded);
        setFlows(flowList);
        setDraft(initial);
        setRootText(JSON.stringify(initial.root, null, 2));
        setStatus('ready');
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setLoadError(describeError(caught));
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [client, slug]);

  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-[1180px] px-8 pb-14 pt-6">
        <Skeleton className="mb-4 h-12 w-64" />
        <div className="grid grid-cols-2 gap-3.5">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      </div>
    );
  }
  if (status === 'error' || draft === null) {
    return (
      <div className="mx-auto max-w-[1180px] px-8 pt-10">
        <Card
          className="border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive"
          role="alert"
        >
          {loadError ?? 'Load error'}
        </Card>
      </div>
    );
  }

  const validation = validateScreen(draft);
  const latestPublished = versions.find((v) => v.status === 'published');
  const update = (changes: Partial<ScreenDraft>): void => setDraft({ ...draft, ...changes });

  /** Carrega uma tela proposta pela IA (K5) inteira no editor: draft + JSON de escape,
   *  limpa a seleção e refresca as versões (o rascunho já existe no store). */
  const loadProposedScreen = async (body: unknown): Promise<void> => {
    const screen = body as ScreenDraft;
    setDraft(screen);
    setRootText(JSON.stringify(screen.root ?? {}, null, 2));
    setRootError(null);
    setSelectedPath(null);
    await refreshVersions();
  };

  const onRootText = (raw: string): void => {
    setRootText(raw);
    try {
      update({ root: JSON.parse(raw) as ScreenDraft['root'] });
      setRootError(null);
    } catch (caught) {
      setRootError(caught instanceof Error ? caught.message : 'invalid JSON');
    }
  };

  async function saveDraft(): Promise<number | null> {
    setBusy(true);
    try {
      const version = await client.saveDraft('screen', slug, draft);
      await refreshVersions();
      toast.success(t('toast.draftSaved') + ` (v${version})`, {
        description: t('toast.draftSavedBody'),
      });
      return version;
    } catch (caught) {
      toast.error(describeError(caught));
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function publish(): Promise<void> {
    if (!validation.ok) {
      toast.error(t('toast.blocked'), {
        description: t('editor.invalid', { n: validation.issues.length }),
      });
      return;
    }
    setBusy(true);
    try {
      const version = await client.saveDraft('screen', slug, draft);
      await client.publish('screen', slug, version);
      await refreshVersions();
      toast.success(t('toast.published') + ` (v${version})`);
    } catch (caught) {
      toast.error(describeError(caught));
    } finally {
      setBusy(false);
    }
  }
  async function publishExisting(version: number): Promise<void> {
    setBusy(true);
    try {
      await client.publish('screen', slug, version);
      await refreshVersions();
      toast.success(t('toast.published') + ` (v${version})`);
    } catch (caught) {
      toast.error(describeError(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex min-h-full flex-col gap-0">
      {/* toolbar */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-4 border-b bg-background/85 px-8 py-3.5 backdrop-blur">
        <div className="flex flex-1 items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => navigate('/screens')}
            aria-label={t('editor.back')}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-mono text-lg font-semibold tracking-tight">{slug}</h1>
              {versions[0] && (
                <Badge variant={versions[0].status === 'published' ? 'success' : 'warning'}>
                  {versions[0].status === 'published' ? t('status.published') : t('status.draft')} v
                  {versions[0].version}
                </Badge>
              )}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {t('col.published')}: {latestPublished ? `v${latestPublished.version}` : '—'}
            </div>
          </div>
        </div>

        <TabsList>
          <TabsTrigger value="design">
            <LayoutList /> {t('editor.tabDesign')}
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye /> {t('editor.tabPreview')}
          </TabsTrigger>
          <TabsTrigger value="simulate">
            <Play /> {t('editor.tabSimulate')}
          </TabsTrigger>
        </TabsList>

        <div className="flex gap-2.5">
          <Button variant="outline" onClick={() => void saveDraft()} disabled={busy}>
            <Save className="size-4" /> {t('editor.saveDraft')}
          </Button>
          <Button onClick={() => void publish()} disabled={busy || !mayPublish}>
            <Rocket className="size-4" /> {t('editor.publish')}
          </Button>
        </div>
      </div>

      {/* TAB: DESIGN — editor WYSIWYG (paleta · canvas · inspector) */}
      <TabsContent value="design" className="flex w-full flex-col gap-4 px-6 pb-14 pt-4">
        {/* barra de settings da tela + status de validação */}
        <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="screen-id" className="text-[11px] text-muted-foreground">
              id
            </Label>
            <Input
              id="screen-id"
              value={draft.id ?? ''}
              onChange={(e) => update({ id: e.target.value })}
              className="h-8 w-36 font-mono text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="screen-route" className="text-[11px] text-muted-foreground">
              {t('screens.route')}
            </Label>
            <Input
              id="screen-route"
              value={draft.route ?? ''}
              onChange={(e) => update({ route: e.target.value })}
              className="h-8 w-44 font-mono text-xs"
              placeholder="/home"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">{t('screens.dataFlow')}</Label>
            <Select value={draft.dataFlow ?? ''} onValueChange={(v) => update({ dataFlow: v })}>
              <SelectTrigger className="h-8 w-52 font-mono text-xs">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {draft.dataFlow !== undefined &&
                  draft.dataFlow !== '' &&
                  !flows.some((f) => f.slug === draft.dataFlow) && (
                    <SelectItem value={draft.dataFlow} className="font-mono text-xs">
                      {draft.dataFlow} — {t('screens.flowMissing')}
                    </SelectItem>
                  )}
                {flows.map((flow) => (
                  <SelectItem key={flow.slug} value={flow.slug} className="font-mono text-xs">
                    {flow.slug}
                    {flow.publishedVersion === null ? ` — ${t('status.draft')}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {validation.ok ? (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-green-700">
              <CheckCircle2 className="size-3.5" /> {t('editor.valid')}
            </span>
          ) : (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="size-3.5" />
              {t('editor.invalid', { n: validation.issues.length })}
            </span>
          )}
        </div>

        {/* IA: propor a tela em linguagem natural (K5) — carrega o rascunho no canvas */}
        <ProposePanel
          kind="screen"
          slug={slug}
          published={latestPublished?.body ?? null}
          onProposed={(_version, body) => loadProposedScreen(body)}
          renderReview={(body, published) => (
            <ScreenIntentReview screen={body} published={published} />
          )}
          placeholder="ex.: tela de saldo com um KPI e a lista de transações"
        />

        {/* editor de 3 colunas */}
        <div className="grid h-[640px] grid-cols-[15rem_1fr_20rem] overflow-hidden rounded-xl border bg-card">
          <Palette onAdd={handleAdd} />
          <ScreenCanvas ctx={canvasCtx} root={draft.root as TemplateNode} />
          <NodeInspector
            root={draft.root as TemplateNode}
            path={selectedPath}
            onPatchProps={handlePatchProps}
            onPatchNode={handlePatchNode}
            onSelect={handleSelect}
            onRemove={handleRemove}
          />
        </div>

        <div className="space-y-4">
          {!validation.ok && (
            <Card className="border-destructive/30 bg-destructive/5 p-4">
              <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
                {validation.issues.map((issue, i) => (
                  <li key={i}>
                    <code className="font-mono text-destructive">{issue.path}</code> —{' '}
                    {issue.message}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <details className="rounded-xl border bg-card">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-muted-foreground">
              {t('screens.rootJson')}
            </summary>
            <div className="p-4 pt-0">
              <Textarea
                value={rootText}
                onChange={(e) => onRootText(e.target.value)}
                rows={16}
                className="font-mono text-xs"
                spellCheck={false}
              />
              {rootError !== null && (
                <p className="mt-2 text-xs text-destructive">
                  {t('screens.invalidJson')}: {rootError}
                </p>
              )}
            </div>
          </details>

          <VersionsTable
            versions={versions}
            busy={busy}
            mayPublish={mayPublish}
            onPublish={(version) => void publishExisting(version)}
          />
        </div>
      </TabsContent>

      {/* TAB: PREVIEW — tema do tenant + viewport + dados de amostra (K4) */}
      <TabsContent value="preview" className="mx-auto w-full max-w-[1180px] px-6 pb-14 pt-6">
        <ScreenPreviewPanel root={draft.root as TemplateNode} />
      </TabsContent>

      {/* TAB: SIMULATE — roda o dataFlow com mock runner (K4) */}
      <TabsContent value="simulate" className="mx-auto w-full max-w-[1180px] px-6 pb-14 pt-6">
        <SimulatePanel dataFlow={draft.dataFlow ?? slug} root={draft.root as TemplateNode} />
      </TabsContent>
    </Tabs>
  );
}
