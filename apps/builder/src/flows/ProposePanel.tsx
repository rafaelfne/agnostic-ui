import { type ReactElement, useState } from 'react';
import { Sparkles } from 'lucide-react';

import { BuilderApiError } from '../api/client';
import type { ProposeResult } from '../api/types';
import { useBuilderClient } from '../api/useBuilderClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { type FlowIntent, type IntentDiff, diffIntent, flowIntent } from './flowIntent';
import type { FlowDraft } from './flowModel';
import { type OpMaturity, operatorMaturities } from './vocabulary';

/** Tier → cor do badge (mesma escala do pré-flight server-side, G5). */
const TIER_VARIANT = { safe: 'success', sensitive: 'warning', critical: 'destructive' } as const;

/** Maturidade → cor (Fase J): core estabelecido (neutro), proven ok, experimental/unknown alerta. */
const MATURITY_VARIANT = {
  core: 'secondary',
  proven: 'success',
  experimental: 'warning',
  unknown: 'destructive',
} as const satisfies Record<OpMaturity, string>;

/** Operadores do flow com sua MATURIDADE de governança (J.2): core mostra só o nome; o
 *  resto traz o rótulo + cor. A graduação para core é gated e precisa de um store de
 *  extensões (ainda não existe) — por isso aqui é leitura, sem ação de graduar. */
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

function errorText(caught: unknown): string {
  if (caught instanceof BuilderApiError) {
    return caught.detail === undefined ? caught.code : `${caught.code} — ${caught.detail}`;
  }
  return caught instanceof Error ? caught.message : 'Unexpected error';
}

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

/** Revisão de intenção, derivada do contrato — não JSON cru (I.4, ADR 0006 §5). */
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
      <p className="text-xs text-muted-foreground">
        Maturity: core (governed built-in) · proven (certified extension) · experimental (unproven)
        · unknown (no contract). Graduating an extension to core is gated and needs an extension
        store — coming next.
      </p>
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

interface ProposePanelProps {
  slug: string;
  /** O flow publicado (base do diff de intenção), ou `null` se nada publicado. */
  publishedFlow: FlowDraft | null;
  /** Chamado quando uma proposta vira draft: carrega o draft no editor + refresca. */
  onProposed: (version: number, body: FlowDraft) => void | Promise<void>;
}

/**
 * Painel "Propor com IA" (I.4, ADR 0006): prompt → proposta (a IA nunca publica) →
 * revisão de INTENÇÃO derivada do contrato (tier/egress/eventos/escritas/irreversível)
 * + diff vs o publicado. Uma proposta barrada (triagem/indisponível) aparece como erro
 * fail-closed, sem draft.
 */
export function ProposePanel({ slug, publishedFlow, onProposed }: ProposePanelProps): ReactElement {
  const client = useBuilderClient();
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    proposal: ProposeResult;
    intent: FlowIntent | null;
    diff: IntentDiff | null;
  } | null>(null);

  async function propose(): Promise<void> {
    if (prompt.trim() === '') return;
    setBusy(true);
    setError(null);
    setResult(null);

    let proposal: ProposeResult;
    try {
      proposal = await client.propose('flow', slug, prompt);
    } catch (caught) {
      // Proposta barrada fail-closed (triagem/IA indisponível): mostra o motivo, sem draft.
      setError(errorText(caught));
      setBusy(false);
      return;
    }

    // A proposta virou draft. Carrega a intenção best-effort, mas SEMPRE dá feedback
    // (nunca silencioso): se o body não carregar, o resultado da proposta ainda aparece.
    let intent: FlowIntent | null = null;
    let diff: IntentDiff | null = null;
    try {
      if (proposal.version !== undefined) {
        const versions = await client.listVersions('flow', slug);
        const body = versions.find((version) => version.version === proposal.version)?.body as
          | FlowDraft
          | undefined;
        if (body !== undefined) {
          intent = flowIntent(body);
          diff = diffIntent(publishedFlow !== null ? flowIntent(publishedFlow) : null, intent);
          await onProposed(proposal.version, body);
        }
      }
    } catch {
      // Falha ao carregar/aplicar a intenção do draft — ainda mostramos a proposta abaixo.
    }
    setResult({ proposal, intent, diff });
    setBusy(false);
  }

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <h3 className="font-medium">Propose with AI</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Describe the change in natural language. The AI proposes a draft — it never publishes;
        review the intent below, then publish if you have the role.
      </p>
      <Label htmlFor="ai-prompt" className="sr-only">
        Prompt
      </Label>
      <Textarea
        id="ai-prompt"
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder="e.g. fetch the balance and show it on a card"
        rows={3}
        disabled={busy}
      />
      <Button onClick={() => void propose()} disabled={busy || prompt.trim() === ''}>
        <Sparkles className="size-4" /> {busy ? 'Proposing…' : 'Propose'}
      </Button>

      {error !== null && <p className="text-sm text-destructive">Blocked: {error}</p>}

      {result !== null && (
        <div className="space-y-3 rounded-md border p-3">
          <div className="flex flex-wrap items-center gap-2">
            {result.proposal.resolution !== undefined && (
              <Badge variant="outline">triage: {result.proposal.resolution}</Badge>
            )}
            <Badge variant={result.proposal.valid ? 'success' : 'destructive'}>
              {result.proposal.valid
                ? 'schema-valid draft'
                : `invalid: ${result.proposal.error ?? 'unknown'}`}
            </Badge>
            {result.proposal.version !== undefined && (
              <span className="text-sm text-muted-foreground">
                v{result.proposal.version} (draft, not published)
              </span>
            )}
          </div>
          {result.intent !== null && result.diff !== null ? (
            <IntentReview intent={result.intent} diff={result.diff} />
          ) : (
            result.proposal.version !== undefined && (
              <p className="text-sm text-muted-foreground">
                Draft v{result.proposal.version} created — open the Versions tab to review its
                steps.
              </p>
            )
          )}
          {result.proposal.rationale !== '' && (
            <p className="text-sm text-muted-foreground">{result.proposal.rationale}</p>
          )}
        </div>
      )}
    </Card>
  );
}
