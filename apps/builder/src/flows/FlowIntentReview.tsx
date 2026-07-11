import type { FlowDefinitionInput } from '@yukilabs/agnostic-ui-engine';
import type { ReactElement } from 'react';

import { Badge } from '@/components/ui/badge';

import { type FlowIntent, type IntentDiff, diffIntent, flowIntent } from './flowIntent';
import { type OpMaturity, operatorMaturities } from './vocabulary';

/** Tier → cor do badge (mesma escala do pré-flight server-side, G5). */
const TIER_VARIANT = { safe: 'success', sensitive: 'warning', critical: 'destructive' } as const;

/** Maturidade → cor (Fase J). */
const MATURITY_VARIANT = {
  core: 'secondary',
  proven: 'success',
  experimental: 'warning',
  unknown: 'destructive',
} as const satisfies Record<OpMaturity, string>;

function ReviewRow({
  label,
  values,
  added,
}: {
  label: string;
  values: string[];
  added: string[];
}): ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-muted-foreground">{label}:</span>
      {values.length === 0 ? (
        <span className="text-muted-foreground">none</span>
      ) : (
        values.map((value) => (
          <Badge key={value} variant={added.includes(value) ? 'warning' : 'secondary'}>
            {added.includes(value) ? `${value} (new)` : value}
          </Badge>
        ))
      )}
    </div>
  );
}

function OperatorMaturityRow({
  operators,
  added,
}: {
  operators: string[];
  added: string[];
}): ReactElement {
  const maturities = operatorMaturities(operators);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-muted-foreground">Operators:</span>
      {maturities.length === 0 ? (
        <span className="text-muted-foreground">none</span>
      ) : (
        maturities.map(({ op, maturity }) => (
          <Badge key={op} variant={MATURITY_VARIANT[maturity]} title={`maturity: ${maturity}`}>
            {op}
            {maturity !== 'core' ? ` · ${maturity}` : ''}
            {added.includes(op) ? ' (new)' : ''}
          </Badge>
        ))
      )}
    </div>
  );
}

function IntentReview({ intent, diff }: { intent: FlowIntent; diff: IntentDiff }): ReactElement {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Trust tier:</span>
        <Badge variant={TIER_VARIANT[intent.tier]}>{intent.tier}</Badge>
        {diff.tierEscalated && diff.tierBefore !== null && (
          <span className="text-amber-600">↑ escalated from {diff.tierBefore}</span>
        )}
      </div>
      <ReviewRow
        label="Calls integrations"
        values={intent.integrations}
        added={diff.addedIntegrations}
      />
      <ReviewRow label="Emits events" values={intent.emits} added={diff.addedEmits} />
      <ReviewRow label="Writes" values={intent.writes} added={[]} />
      <OperatorMaturityRow operators={intent.operators} added={diff.addedOperators} />
      {intent.irreversible && (
        <p className="text-destructive">
          ⚠ contains an irreversible step — requires human pre-flight
          {diff.becameIrreversible ? ' (new)' : ''}.
        </p>
      )}
      {intent.unknownOps.length > 0 && (
        <p className="text-destructive">
          ⚠ unknown operators (no contract): {intent.unknownOps.join(', ')}
        </p>
      )}
    </div>
  );
}

/** Revisão de intenção de FLOW p/ o ProposePanel genérico (I.4): tier/egress/eventos/
 *  escritas/maturidade, com diff vs o publicado. */
export function FlowIntentReview({
  flow,
  published,
}: {
  flow: unknown;
  published: unknown;
}): ReactElement {
  const intent = flowIntent(flow as FlowDefinitionInput);
  const before =
    published !== null && published !== undefined
      ? flowIntent(published as FlowDefinitionInput)
      : null;
  return <IntentReview intent={intent} diff={diffIntent(before, intent)} />;
}
