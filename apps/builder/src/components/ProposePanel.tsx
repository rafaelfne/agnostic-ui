import { type ReactElement, type ReactNode, useState } from 'react';
import { Sparkles } from 'lucide-react';

import { BuilderApiError } from '../api/client';
import type { ArtifactKind, ProposeResult } from '../api/types';
import { useBuilderClient } from '../api/useBuilderClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

function errorText(caught: unknown): string {
  if (caught instanceof BuilderApiError) {
    return caught.detail === undefined ? caught.code : `${caught.code} — ${caught.detail}`;
  }
  return caught instanceof Error ? caught.message : 'Unexpected error';
}

interface ProposePanelProps {
  kind: ArtifactKind;
  slug: string;
  /** Body publicado (base do diff de intenção), ou `null` se nada publicado. */
  published: unknown;
  /** Chamado quando a proposta vira draft: carrega o body no editor + refresca. */
  onProposed: (version: number, body: unknown) => void | Promise<void>;
  /** Revisão de intenção do body proposto vs publicado — específica do kind (I.4/K5). */
  renderReview: (proposedBody: unknown, published: unknown) => ReactNode;
  placeholder?: string;
}

/**
 * Painel "Propor com IA" (I.4/K5, ADR 0006) — kind-agnóstico: prompt → proposta (a IA
 * NUNCA publica) → revisão de intenção (injetada por `renderReview`) + badges do portão.
 * Uma proposta barrada (triagem/indisponível) aparece como erro fail-closed, sem draft.
 * Sempre dá feedback: se o body não carregar, a proposta ainda aparece.
 */
export function ProposePanel({
  kind,
  slug,
  published,
  onProposed,
  renderReview,
  placeholder,
}: ProposePanelProps): ReactElement {
  const client = useBuilderClient();
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ proposal: ProposeResult; body: unknown } | null>(null);

  async function propose(): Promise<void> {
    if (prompt.trim() === '') return;
    setBusy(true);
    setError(null);
    setResult(null);

    let proposal: ProposeResult;
    try {
      proposal = await client.propose(kind, slug, prompt);
    } catch (caught) {
      setError(errorText(caught));
      setBusy(false);
      return;
    }

    let body: unknown = null;
    try {
      if (proposal.version !== undefined) {
        const versions = await client.listVersions(kind, slug);
        const found = versions.find((version) => version.version === proposal.version)?.body;
        if (found !== undefined) {
          body = found;
          await onProposed(proposal.version, found);
        }
      }
    } catch {
      // Falha ao carregar/aplicar o body — a proposta ainda aparece abaixo.
    }
    setResult({ proposal, body });
    setBusy(false);
  }

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <h3 className="font-medium">Propor com IA</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Descreva em linguagem natural. A IA propõe um rascunho — ela nunca publica; revise a
        intenção e publique se tiver o papel.
      </p>
      <Label htmlFor="ai-prompt" className="sr-only">
        Prompt
      </Label>
      <Textarea
        id="ai-prompt"
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder={placeholder}
        rows={3}
        disabled={busy}
      />
      <Button onClick={() => void propose()} disabled={busy || prompt.trim() === ''}>
        <Sparkles className="size-4" /> {busy ? 'Propondo…' : 'Propor'}
      </Button>

      {error !== null && <p className="text-sm text-destructive">Bloqueado: {error}</p>}

      {result !== null && (
        <div className="space-y-3 rounded-md border p-3">
          <div className="flex flex-wrap items-center gap-2">
            {result.proposal.resolution !== undefined && (
              <Badge variant="outline">triagem: {result.proposal.resolution}</Badge>
            )}
            <Badge variant={result.proposal.valid ? 'success' : 'destructive'}>
              {result.proposal.valid
                ? 'rascunho válido no schema'
                : `inválido: ${result.proposal.error ?? 'unknown'}`}
            </Badge>
            {result.proposal.version !== undefined && (
              <span className="text-sm text-muted-foreground">
                v{result.proposal.version} (rascunho, não publicado)
              </span>
            )}
          </div>
          {result.body !== null
            ? renderReview(result.body, published)
            : result.proposal.version !== undefined && (
                <p className="text-sm text-muted-foreground">
                  Rascunho v{result.proposal.version} criado — abra as versões para revisar.
                </p>
              )}
          {result.proposal.rationale !== '' && (
            <p className="text-sm text-muted-foreground">{result.proposal.rationale}</p>
          )}
        </div>
      )}
    </Card>
  );
}
