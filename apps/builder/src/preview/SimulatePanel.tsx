import type { MockProfile, TemplateNode } from '@yukilabs/agnostic-ui-core';
import type { FlowDefinitionInput } from '@yukilabs/agnostic-ui-engine';
import {
  SduiRenderer,
  createMockRunner,
  shadcnRegistry,
  useFlow,
} from '@yukilabs/agnostic-ui-react';
import { type ReactElement, type ReactNode, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Play, Workflow } from 'lucide-react';

import { BuilderApiError } from '../api/client';
import { useBuilderClient } from '../api/useBuilderClient';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import { PreviewFrame, type Viewport } from './PreviewFrame';
import {
  DEFAULT_THEME_CHOICE,
  type ThemeChoice,
  ThemeSelector,
  ViewportToggle,
  resolveTheme,
} from './PreviewControls';
import { fixtureSkeleton, toMockFixtures } from './simulate';

const PROFILES: readonly MockProfile[] = ['happyPath', 'empty', 'error', 'slow'];

interface RunConfig {
  fixtures: Record<string, Record<string, unknown>>;
  profile: MockProfile;
}

/** Renderiza o body do flow: TemplateNode (o flow compõe a tela) → direto; senão os
 *  dados viram o scope do `root` da própria tela. */
function renderBody(body: unknown, root: TemplateNode): ReactNode {
  if (body !== null && typeof body === 'object' && 'type' in body) {
    return <SduiRenderer node={body as TemplateNode} registry={shadcnRegistry} />;
  }
  const scope = body !== null && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  return <SduiRenderer node={root} registry={shadcnRegistry} scope={scope} />;
}

/** Roda o flow no browser (`useFlow`) e renderiza — isolado p/ manter o hook fora de
 *  ramos condicionais do painel. */
function SimulateRun({
  flow,
  run,
  root,
  themeChoice,
  viewport,
}: {
  flow: FlowDefinitionInput;
  run: RunConfig;
  root: TemplateNode;
  themeChoice: ThemeChoice;
  viewport: Viewport;
}): ReactElement {
  const deps = useMemo(
    () => ({ integrationRunner: createMockRunner(toMockFixtures(run.fixtures)) }),
    [run.fixtures],
  );
  const state = useFlow(
    flow,
    {
      auth: {
        mode: 'sandbox',
        tenantId: 'preview',
        customerId: 'preview',
        mockProfile: run.profile,
      },
    },
    deps,
  );
  const theme = resolveTheme(themeChoice);

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
      <div className="rounded-xl border bg-[repeating-linear-gradient(45deg,#fafafa,#fafafa_10px,#f4f4f5_10px,#f4f4f5_20px)]">
        <PreviewFrame viewport={viewport} theme={theme}>
          {state.status === 'loading' && (
            <p className="p-6 text-center text-xs text-muted-foreground">rodando…</p>
          )}
          {state.status === 'error' && (
            <div className="m-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              <p className="font-medium">
                {state.error.kind} · {state.error.code}
              </p>
              <p className="mt-1 text-muted-foreground">{state.error.message}</p>
            </div>
          )}
          {state.status === 'success' && renderBody(state.body, root)}
        </PreviewFrame>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          eventos emitidos
        </p>
        {state.status === 'success' && state.emitted.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {state.emitted.map((event, i) => (
              <li
                key={`${event.event}-${i}`}
                className="rounded-md border bg-card px-2 py-1 font-mono text-[11px]"
              >
                {event.event}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">nenhum</p>
        )}
      </div>
    </div>
  );
}

type LoadState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error'; message: string }
  | { status: 'ready'; flow: FlowDefinitionInput };

/**
 * "Simular ao vivo" (K4, pendência da Fase E): busca o flow publicado do `dataFlow`,
 * roda no browser via `useFlow` + `createMockRunner` com fixtures editáveis e perfil
 * sandbox, e renderiza o resultado (tela + eventos emitidos). Nenhum backend real.
 */
export function SimulatePanel({
  dataFlow,
  root,
}: {
  dataFlow: string;
  root: TemplateNode;
}): ReactElement {
  const client = useBuilderClient();
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [fixturesText, setFixturesText] = useState('{}');
  const [profile, setProfile] = useState<MockProfile>('happyPath');
  const [run, setRun] = useState<RunConfig | null>(null);
  const [themeChoice, setThemeChoice] = useState<ThemeChoice>(DEFAULT_THEME_CHOICE);
  const [viewport, setViewport] = useState<Viewport>('mobile');

  useEffect(() => {
    let active = true;
    setLoad({ status: 'loading' });
    setRun(null);
    client
      .getPublished('flow', dataFlow)
      .then((body) => {
        if (!active) return;
        if (body === null) {
          setLoad({ status: 'missing' });
          return;
        }
        const flow = body as FlowDefinitionInput;
        setFixturesText(JSON.stringify(fixtureSkeleton(flow), null, 2));
        setLoad({ status: 'ready', flow });
      })
      .catch((caught: unknown) => {
        if (!active) return;
        const message =
          caught instanceof BuilderApiError
            ? caught.code
            : caught instanceof Error
              ? caught.message
              : 'error';
        setLoad({ status: 'error', message });
      });
    return () => {
      active = false;
    };
  }, [client, dataFlow]);

  const onRun = (): void => {
    try {
      const fixtures = JSON.parse(fixturesText) as Record<string, Record<string, unknown>>;
      setRun({ fixtures, profile });
    } catch {
      toast.error('fixtures JSON inválido');
    }
  };

  if (load.status === 'loading') {
    return <Skeleton className="h-40 w-full" />;
  }
  if (load.status === 'missing') {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <AlertTriangle className="size-4" />
        Publique o flow <code className="font-mono">{dataFlow}</code> primeiro para simular esta
        tela.
      </div>
    );
  }
  if (load.status === 'error') {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {load.message}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-3">
        <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          <Workflow className="size-3.5" /> {dataFlow}
        </span>
        <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-0.5">
          {PROFILES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setProfile(p)}
              className={cn(
                'rounded-md px-2 py-1 text-xs font-medium',
                profile === p ? 'bg-white text-zinc-900 shadow-sm' : 'text-muted-foreground',
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <ThemeSelector value={themeChoice} onChange={setThemeChoice} />
        <ViewportToggle value={viewport} onChange={setViewport} />
        <Button onClick={onRun} className="ml-auto">
          <Play className="size-4" /> Rodar simulação
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            fixtures (JSON)
          </label>
          <Textarea
            value={fixturesText}
            onChange={(e) => setFixturesText(e.target.value)}
            rows={14}
            spellCheck={false}
            className="font-mono text-xs"
          />
          <p className="text-[11px] leading-snug text-muted-foreground">
            Esqueleto derivado dos steps <code>call-integration</code>. Preencha o valor de retorno
            de cada operação.
          </p>
        </div>

        <div>
          {run === null ? (
            <div className="grid h-full min-h-40 place-items-center rounded-xl border text-sm text-muted-foreground">
              Configure as fixtures e clique em “Rodar simulação”.
            </div>
          ) : (
            <SimulateRun
              flow={load.flow}
              run={run}
              root={root}
              themeChoice={themeChoice}
              viewport={viewport}
            />
          )}
        </div>
      </div>
    </div>
  );
}
