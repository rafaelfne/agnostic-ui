import type { StepDef } from '@yukilabs/agnostic-ui-engine';
import { type ReactElement, useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, LayoutList, Play, Rocket, Save, Workflow } from 'lucide-react';

import { BuilderApiError } from '../api/client';
import type { ArtifactVersion } from '../api/types';
import { useBuilderClient } from '../api/useBuilderClient';
import { useAuth } from '../auth/AuthContext';
import { canPublish } from '../auth/roles';
import { StringListInput } from '@/components/StringListInput';
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
import { useI18n } from '@/i18n/i18n';

import { FlowCanvasPlaceholder } from './FlowCanvasPlaceholder';
import { PreviewPane } from './PreviewPane';
import { ProposePanel } from './ProposePanel';
import { StepEditor, StepPipelineItem } from './StepEditor';
import { type FlowDraft, type StepOp, emptyFlow, emptyStep, validateFlow } from './flowModel';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
const ADDABLE_OPS = [
  'validate',
  'call-integration',
  'compose-template',
  'branch',
  'emit-event',
] as const;

function describeError(caught: unknown): string {
  if (caught instanceof BuilderApiError) {
    return caught.detail === undefined
      ? `Failed: ${caught.code}`
      : `Failed: ${caught.code} — ${caught.detail}`;
  }
  return caught instanceof Error ? caught.message : 'Unexpected error';
}
function exprText(value: unknown): string {
  if (value === undefined) return '';
  return typeof value === 'string' ? value : JSON.stringify(value);
}

export function FlowEditorPage(): ReactElement {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const client = useBuilderClient();
  const { token } = useAuth();
  const mayPublish = canPublish(token);
  const { t } = useI18n();

  const [draft, setDraft] = useState<FlowDraft | null>(null);
  const [versions, setVersions] = useState<ArtifactVersion[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('editor');
  const [selected, setSelected] = useState(0);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const refreshVersions = useCallback(async () => {
    setVersions(await client.listVersions('flow', slug));
  }, [client, slug]);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    client
      .listVersions('flow', slug)
      .then((loaded) => {
        if (!active) return;
        setVersions(loaded);
        setDraft((loaded[0]?.body as FlowDraft | undefined) ?? emptyFlow(slug));
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

  const steps: StepDef[] = Array.isArray(draft.steps) ? draft.steps : [];
  const input = draft.input ?? { from: 'executionContext', pick: [] };
  const validation = validateFlow(draft);
  const sel = Math.min(selected, Math.max(0, steps.length - 1));
  const issuePaths = new Set(validation.ok ? [] : validation.issues.map((i) => i.path));
  const stepHasIssue = (i: number) => [...issuePaths].some((p) => p.startsWith(`steps.${i}`));

  const update = (changes: Partial<FlowDraft>): void => setDraft({ ...draft, ...changes });
  const updateStep = (index: number, next: StepDef): void =>
    update({ steps: steps.map((s, idx) => (idx === index ? next : s)) });
  const moveStep = (from: number, to: number): void => {
    if (to < 0 || to >= steps.length || from === to) return;
    const next = [...steps];
    const [m] = next.splice(from, 1);
    if (m === undefined) return;
    next.splice(to, 0, m);
    update({ steps: next });
    setSelected(to);
  };

  async function saveDraft(): Promise<number | null> {
    setBusy(true);
    try {
      const version = await client.saveDraft('flow', slug, draft);
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
      const version = await client.saveDraft('flow', slug, draft);
      await client.publish('flow', slug, version);
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
      await client.publish('flow', slug, version);
      await refreshVersions();
      toast.success(t('toast.published') + ` (v${version})`);
    } catch (caught) {
      toast.error(describeError(caught));
    } finally {
      setBusy(false);
    }
  }

  const trigger = draft.trigger;
  const triggerKind = trigger?.kind ?? 'none';
  const latestPublished = versions.find((v) => v.status === 'published');

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex min-h-full flex-col gap-0">
      {/* toolbar */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-4 border-b bg-background/85 px-8 py-3.5 backdrop-blur">
        <div className="flex flex-1 items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => navigate('/flows')}
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
          <TabsTrigger value="editor">
            <LayoutList /> {t('editor.tabEditor')}
          </TabsTrigger>
          <TabsTrigger value="canvas">
            <Workflow /> {t('editor.tabCanvas')}
            <Badge variant="secondary" className="px-1.5 py-0 text-[9px]">
              SOON
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Play /> {t('editor.tabPreview')}
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

      {/* TAB: EDITOR */}
      <TabsContent value="editor" className="mx-auto w-full max-w-[1180px] px-8 pb-14 pt-6">
        <div className="mb-4">
          <ProposePanel
            slug={slug}
            publishedFlow={(latestPublished?.body as FlowDraft | undefined) ?? null}
            onProposed={async (_version, body) => {
              setDraft(body);
              await refreshVersions();
            }}
          />
        </div>
        <div className="mb-4 grid gap-3.5 lg:grid-cols-2">
          <Card className="p-4.5">
            <h3 className="mb-3.5 flex items-center gap-2 text-sm font-semibold">
              <span className="size-1.5 rounded-full bg-primary" />
              {t('editor.general')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <FieldInput label="id" value={draft.id} onChange={(v) => update({ id: v })} />
              <FieldInput
                label="name"
                mono={false}
                value={draft.name}
                onChange={(v) => update({ name: v })}
              />
              <div className="col-span-2">
                <FieldInput
                  label="output"
                  hint={` ${t('hint.expression')}`}
                  value={exprText(draft.output)}
                  onChange={(v) => update({ output: v })}
                />
              </div>
              <div className="col-span-2">
                <StringListInput
                  label="emits"
                  hint={` ${t('hint.comma')}`}
                  value={draft.emits ?? []}
                  placeholder="balance-viewed"
                  onChange={(emits) => update({ emits })}
                />
              </div>
            </div>
          </Card>

          <Card className="p-4.5">
            <h3 className="mb-3.5 flex items-center gap-2 text-sm font-semibold">
              <span className="size-1.5 rounded-full bg-chart-2" />
              {t('editor.triggerInput')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">trigger</Label>
                <Select
                  value={triggerKind}
                  onValueChange={(v) =>
                    update({
                      trigger:
                        v === 'http'
                          ? { kind: 'http', method: 'GET', path: `/api/${slug}` }
                          : undefined,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">none</SelectItem>
                    <SelectItem value="http">http</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {trigger?.kind === 'http' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">method</Label>
                    <Select
                      value={trigger.method}
                      onValueChange={(v) =>
                        update({
                          trigger: { ...trigger, method: v as (typeof HTTP_METHODS)[number] },
                        })
                      }
                    >
                      <SelectTrigger className="font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HTTP_METHODS.map((m) => (
                          <SelectItem key={m} value={m} className="font-mono">
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <FieldInput
                      label="path"
                      value={trigger.path}
                      onChange={(v) => update({ trigger: { ...trigger, path: v } })}
                    />
                  </div>
                </>
              )}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">input.from</Label>
                <Select
                  value={input.from ?? 'executionContext'}
                  onValueChange={(v) =>
                    update({ input: { ...input, from: v as typeof input.from } })
                  }
                >
                  <SelectTrigger className="font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="executionContext" className="font-mono">
                      executionContext
                    </SelectItem>
                    <SelectItem value="request" className="font-mono">
                      request
                    </SelectItem>
                    <SelectItem value="none" className="font-mono">
                      none
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <StringListInput
                  label="input.pick"
                  value={input.pick ?? []}
                  placeholder="customerId"
                  onChange={(pick) => update({ input: { ...input, pick } })}
                />
              </div>
            </div>
          </Card>
        </div>

        <div className="mb-4 grid items-start gap-3.5 lg:grid-cols-[360px_1fr]">
          {/* pipeline */}
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {t('editor.steps')}{' '}
                <span className="font-normal text-muted-foreground">· pipeline</span>
              </h3>
              <span className="font-mono text-[11px] text-muted-foreground">
                {t('editor.dragHint')}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {steps.map((step, i) => (
                <StepPipelineItem
                  key={i}
                  step={step}
                  index={i}
                  selected={i === sel}
                  hasIssue={stepHasIssue(i)}
                  onSelect={() => setSelected(i)}
                  onRemove={() => update({ steps: steps.filter((_, idx) => idx !== i) })}
                  dragProps={{
                    draggable: true,
                    onDragStart: () => setDragIndex(i),
                    onDragOver: (e) => e.preventDefault(),
                    onDrop: (e) => {
                      e.preventDefault();
                      if (dragIndex !== null) moveStep(dragIndex, i);
                      setDragIndex(null);
                    },
                    onDragEnd: () => setDragIndex(null),
                  }}
                />
              ))}
            </div>
            <Select
              value=""
              onValueChange={(v) => {
                update({ steps: [...steps, emptyStep(v as StepOp)] });
                setSelected(steps.length);
              }}
            >
              <SelectTrigger className="mt-3 border-dashed bg-muted/40 text-muted-foreground">
                <span>+ {t('editor.addStep')}</span>
              </SelectTrigger>
              <SelectContent>
                {ADDABLE_OPS.map((op) => (
                  <SelectItem key={op} value={op} className="font-mono">
                    {op}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>

          {/* selected step + validation */}
          <div className="flex flex-col gap-3.5">
            <Card className="p-4.5">
              {steps[sel] ? (
                <StepEditor
                  step={steps[sel]}
                  index={sel}
                  onChange={(next) => updateStep(sel, next)}
                />
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </Card>

            <Card className="p-4.5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                {t('editor.validation')}{' '}
                <span className="font-mono text-[11px] font-normal text-muted-foreground">
                  FlowDefinitionSchema
                </span>
              </h3>
              {validation.ok ? (
                <div className="flex items-center gap-2.5 rounded-lg border border-success/30 bg-success/10 px-3.5 py-2.5 text-sm text-success">
                  <CheckCircle2 className="size-4" /> {t('editor.valid')}
                </div>
              ) : (
                <>
                  <div className="mb-1 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                    {t('editor.invalid', { n: validation.issues.length })}
                  </div>
                  <ul>
                    {validation.issues.map((issue, i) => (
                      <li
                        key={i}
                        role="alert"
                        className="flex items-start gap-2.5 border-b py-2.5 last:border-0"
                      >
                        <code className="rounded bg-destructive/10 px-1.5 font-mono text-xs font-semibold text-destructive">
                          {issue.path}
                        </code>
                        <span className="text-sm">{issue.message}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          </div>
        </div>

        {/* version history */}
        <VersionsTable
          versions={versions}
          busy={busy}
          mayPublish={mayPublish}
          onPublish={(version) => void publishExisting(version)}
        />
      </TabsContent>

      {/* TAB: CANVAS (React Flow placeholder) */}
      <TabsContent value="canvas" className="mx-auto w-full max-w-[1180px] px-8 pb-14 pt-6">
        <FlowCanvasPlaceholder flow={draft} />
      </TabsContent>

      {/* TAB: PREVIEW (SDUI shadcn/Recharts registry) */}
      <TabsContent value="preview" className="mx-auto w-full max-w-[1180px] px-8 pb-14 pt-6">
        <PreviewPane />
      </TabsContent>
    </Tabs>
  );
}

function FieldInput({
  label,
  hint,
  value,
  onChange,
  mono = true,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
}): ReactElement {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">
        {label}
        {hint && <span className="font-normal">{hint}</span>}
      </Label>
      <Input
        className={mono ? 'font-mono' : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
