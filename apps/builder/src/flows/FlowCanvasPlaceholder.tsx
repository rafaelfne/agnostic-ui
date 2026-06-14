import type { StepDef } from '@yukilabs/agnostic-ui-engine';
import type { ReactElement } from 'react';
import { Check, Workflow } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { useI18n } from '@/i18n/i18n';

import type { FlowDraft } from './flowModel';

/**
 * React Flow canvas — PLACEHOLDER (brief §5 / §2). `@xyflow/react` is a planned
 * dependency, not yet implemented. Read-only node-chain preview + "soon" overlay +
 * spec. Reads `flow` without mutating it. Full contract: docs/design/canvas-spec.md.
 */

const STEP_LABEL_KEY: Record<string, string> = {
  validate: 'op.validate',
  'call-integration': 'op.call-integration',
  'compose-template': 'op.compose-template',
  branch: 'op.branch',
  'emit-event': 'op.emit-event',
};

function summarize(step: StepDef): string {
  switch (step.op) {
    case 'validate':
      return step.require?.length ? `require: ${step.require.join(', ')}` : '—';
    case 'call-integration':
      return `${step.integration}.${step.operation} → ${step.as}`;
    case 'compose-template':
      return `→ ${step.as}`;
    case 'branch':
      return `${step.cases?.length ?? 0} case(s)`;
    case 'emit-event':
      return step.event;
    default:
      return '';
  }
}

export function FlowCanvasPlaceholder({ flow }: { flow: FlowDraft }): ReactElement {
  const { t } = useI18n();
  const steps: StepDef[] = Array.isArray(flow.steps) ? flow.steps : [];
  const triggerLabel =
    flow.trigger?.kind === 'http' ? `${flow.trigger.method} ${flow.trigger.path}` : '—';

  const nodes = [
    { key: 'trigger', label: 'Trigger', sub: triggerLabel },
    ...steps.map((s, i) => ({
      key: `s${i}`,
      label: t(STEP_LABEL_KEY[s.op] as 'op.validate'),
      sub: summarize(s),
    })),
    { key: 'output', label: 'Output', sub: 'view' },
  ];

  const bullets = [
    [t('canvas.specTitle'), 'Nodes = steps · StepDef → typed node; trigger/output fixed.'],
    ['Edges', 'order → steps[]; branch = one edge per case.'],
    ['Panel', 'select node → same sub-form (single source: FlowDraft).'],
    ['Validation', 'schema issue → destructive border; layout via dagre.'],
  ];

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_360px]">
      <div className="relative min-h-[540px] overflow-hidden rounded-xl border bg-muted/30 [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:22px_22px]">
        <div className="absolute left-3.5 top-3.5 z-10 inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-[11.5px] font-semibold text-primary shadow-sm">
          <span className="size-1.5 rounded-full bg-primary" /> {t('canvas.badge')}
        </div>

        <div className="flex flex-col items-center px-8 pb-8 pt-16">
          {nodes.map((n, i) => (
            <div key={n.key} className="flex flex-col items-center">
              <div className="w-[200px] rounded-lg border border-l-[3px] border-l-primary bg-card px-3 py-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="size-2 shrink-0 rounded-full bg-primary" />
                  <span className="text-[12.5px] font-semibold">{n.label}</span>
                </div>
                <div className="truncate font-mono text-[11px] text-muted-foreground">{n.sub}</div>
              </div>
              {i < nodes.length - 1 && (
                <div className="my-1.5 h-6 border-l border-dashed border-muted-foreground/50" />
              )}
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-background/40 backdrop-blur-[1.5px]">
          <div className="max-w-[300px] rounded-xl border bg-card p-5 text-center shadow-lg">
            <div className="mx-auto mb-3 grid size-11 place-items-center rounded-lg bg-primary/15 text-primary">
              <Workflow className="size-5.5" />
            </div>
            <div className="mb-1 text-[15px] font-semibold">{t('canvas.soonTitle')}</div>
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              {t('canvas.soonBody')}
            </p>
          </div>
        </div>
      </div>

      <Card className="p-4.5">
        <h3 className="mb-1 text-sm font-semibold">{t('canvas.specTitle')}</h3>
        <p className="mb-3.5 text-xs leading-relaxed text-muted-foreground">
          <code className="font-mono">@xyflow/react</code> — {t('canvas.specDep')}
        </p>
        <div className="flex flex-col gap-3">
          {bullets.map((b, i) => (
            <div key={i} className="flex gap-2.5">
              <Check className="mt-0.5 size-[15px] shrink-0 text-primary" />
              <div className="text-[12.5px] leading-relaxed">
                <strong className="font-semibold">{b[0]}.</strong> {b[1]}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 rounded-lg border bg-muted/40 p-3 text-[11.5px] leading-relaxed text-muted-foreground">
          {t('canvas.footnote')}
        </p>
      </Card>
    </div>
  );
}
