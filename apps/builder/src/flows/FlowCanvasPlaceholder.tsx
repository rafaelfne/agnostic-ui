import type { StepDef } from '@yukilabs/agnostic-ui-engine';
import type { ReactElement } from 'react';

import type { FlowDraft } from './flowModel';

/**
 * React Flow canvas — PLACEHOLDER (brief §5 / §2).
 *
 * The visual graph editor (`@xyflow/react`) is **previsto, não implementado**.
 * This component is the seat it will occupy: it renders a read-only preview of the
 * flow as a node chain (trigger → steps → output) plus a "em breve" overlay and the
 * canvas spec, so the Canvas tab is fully designed without any graph logic yet.
 *
 * Implementation contract for the next wave (do not change here):
 *  - Each `StepDef` becomes a typed node; `trigger` and `output` are fixed edge nodes.
 *  - Edges encode order: reordering rewrites `flow.steps[]`; `branch` emits one edge
 *    per case.
 *  - Selecting a node opens the SAME sub-form as the Editor tab — the single source
 *    of truth stays `FlowDraft`. No new business logic, no contract changes.
 *  - Auto-layout via `dagre`; nodes with a schema issue render a destructive border.
 *
 * Until then this stays purely presentational and reads `flow` without mutating it.
 */

const STEP_LABELS: Record<string, string> = {
  validate: 'Validar entrada',
  'call-integration': 'Chamar integração',
  'compose-template': 'Compor template',
  branch: 'Ramificar',
  'emit-event': 'Emitir evento',
};

function summarize(step: StepDef): string {
  switch (step.op) {
    case 'validate':
      return step.require?.length ? `require: ${step.require.join(', ')}` : 'sem campos';
    case 'call-integration':
      return `${step.integration}.${step.operation} → ${step.as}`;
    case 'compose-template':
      return `→ ${step.as}`;
    case 'branch':
      return `${step.cases?.length ?? 0} caso(s)`;
    case 'emit-event':
      return step.event;
    default:
      return '';
  }
}

export interface FlowCanvasPlaceholderProps {
  flow: FlowDraft;
}

export function FlowCanvasPlaceholder({ flow }: FlowCanvasPlaceholderProps): ReactElement {
  const steps: StepDef[] = Array.isArray(flow.steps) ? flow.steps : [];
  const triggerLabel =
    flow.trigger?.kind === 'http' ? `${flow.trigger.method} ${flow.trigger.path}` : 'sem trigger';

  const nodes = [
    { key: 'trigger', label: 'Trigger', sub: triggerLabel },
    ...steps.map((s, i) => ({
      key: `step-${i}`,
      label: STEP_LABELS[s.op] ?? s.op,
      sub: summarize(s),
    })),
    { key: 'output', label: 'Output', sub: 'view' },
  ];

  return (
    <div className="relative grid gap-4 lg:grid-cols-[1fr_360px]">
      {/* dotted canvas surface */}
      <div className="relative min-h-[540px] overflow-hidden rounded-xl border border-border bg-muted/30 [background-image:radial-gradient(theme(colors.border)_1px,transparent_1px)] [background-size:22px_22px]">
        <div className="absolute left-3.5 top-3.5 z-10 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-primary shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Canvas visual — React Flow · em breve
        </div>

        <div className="flex flex-col items-center gap-0 px-8 pb-8 pt-16">
          {nodes.map((n, i) => (
            <div key={n.key} className="flex flex-col items-center">
              <div className="w-[200px] rounded-lg border border-border border-l-[3px] border-l-primary bg-card px-3 py-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <span className="text-[12.5px] font-semibold">{n.label}</span>
                </div>
                <div className="truncate font-mono text-[11px] text-muted-foreground">{n.sub}</div>
              </div>
              {i < nodes.length - 1 && (
                <div className="my-1.5 h-6 w-px border-l border-dashed border-muted-foreground/50" />
              )}
            </div>
          ))}
        </div>

        {/* "em breve" overlay */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-background/40 backdrop-blur-[1.5px]">
          <div className="max-w-[300px] rounded-xl border border-border bg-card p-5 text-center shadow-lg">
            <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-lg bg-primary/15 text-primary">
              {/* lucide: Workflow */}
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="6" height="6" rx="1" />
                <rect x="15" y="15" width="6" height="6" rx="1" />
                <path d="M9 6h6a2 2 0 0 1 2 2v7" />
              </svg>
            </div>
            <div className="mb-1 text-[15px] font-semibold">Canvas visual em breve</div>
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              Cada step vira um nó arrastável;{' '}
              <code className="font-mono text-[11.5px]">branch</code> abre ramificações. Por ora,
              edite na aba <strong className="text-foreground">Editor</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* spec card */}
      <aside className="rounded-xl border border-border bg-card p-[18px] shadow-sm">
        <h3 className="mb-1 text-sm font-semibold">Spec do canvas</h3>
        <p className="mb-3.5 text-xs leading-relaxed text-muted-foreground">
          <code className="font-mono text-[11.5px]">@xyflow/react</code> — dependência prevista,
          ainda não implementada.
        </p>
        <ul className="flex flex-col gap-3 text-[12.5px] leading-relaxed">
          <li>
            <strong className="font-semibold">Nós = steps.</strong> Cada{' '}
            <code className="font-mono text-[11.5px]">StepDef</code> é um nó tipado; trigger/output
            são nós fixos de borda.
          </li>
          <li>
            <strong className="font-semibold">Arestas = ordem.</strong> Reordenar reescreve{' '}
            <code className="font-mono text-[11.5px]">steps[]</code>;{' '}
            <code className="font-mono text-[11.5px]">branch</code> emite uma aresta por case.
          </li>
          <li>
            <strong className="font-semibold">Painel lateral.</strong> Selecionar um nó abre o mesmo
            sub-form da aba Editor (fonte única no{' '}
            <code className="font-mono text-[11.5px]">FlowDraft</code>).
          </li>
          <li>
            <strong className="font-semibold">Validação inline.</strong> Nós com issue do schema
            ganham borda destrutiva; layout via{' '}
            <code className="font-mono text-[11.5px]">dagre</code>.
          </li>
        </ul>
        <p className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-[11.5px] leading-relaxed text-muted-foreground">
          Sem lógica nova: o canvas lê e escreve o{' '}
          <strong className="text-foreground">mesmo</strong>{' '}
          <code className="font-mono text-[11px]">FlowDraft</code>.
        </p>
      </aside>
    </div>
  );
}
