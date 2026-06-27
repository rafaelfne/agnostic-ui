import type { ConfigArtifactRef, IConfigStore, ILlm } from '../../application/ports';
import { type ArtifactValidationOutcome, validateArtifactVersion } from '../../infra/store';

import { buildGroundVocabulary } from './groundVocabulary';
import { type Triage, triageRequest } from './triage';

export type ProposeError =
  | 'no_proposal'
  | 'triage_blocked'
  | 'triage_needs-extension'
  | 'triage_integration';

export interface ProposeOutcome {
  proposed: boolean;
  version?: number;
  validation?: ArtifactValidationOutcome;
  /** A triagem da IA (I.3): como ela decidiu satisfazer o pedido. */
  triage?: Triage;
  rationale: string;
  error?: ProposeError;
}

function isObjectBody(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Pipeline da proposta da IA (Frente I, ADR 0006). A IA é só mais um editor: sua geração
 * passa pelo MESMO portão (`validateArtifactVersion`) e o MESMO store, e **nunca** publica.
 *
 * 1. **Grounding** (I.2): `context` tenant-scoped, sem valor de secret.
 * 2. **Triagem-primeiro** (I.3): a IA prova que o pedido se resolve com o vocabulário
 *    existente antes de gerar. `needs-extension` sem justificativa = bloqueado fail-closed;
 *    `needs-extension`/`integration` (sem caminho de geração ainda) voltam o veredito,
 *    sem draft.
 * 3. **Geração** (I.1): `composition`/`expression` geram o artefato → draft → validação
 *    sem publicar. Config não-parseável nem vira draft; inválida vira draft revisável.
 */
export async function proposeArtifactVersion(
  store: IConfigStore,
  llm: ILlm,
  ref: ConfigArtifactRef,
  prompt: string,
): Promise<ProposeOutcome> {
  const context = await buildGroundVocabulary(store, ref);

  const triaged = await triageRequest(llm, prompt, context);
  if (!triaged.ok) {
    return { proposed: false, error: 'triage_blocked', rationale: triaged.rationale };
  }
  const { resolution } = triaged.triage;
  if (resolution === 'needs-extension' || resolution === 'integration') {
    return {
      proposed: false,
      error: resolution === 'needs-extension' ? 'triage_needs-extension' : 'triage_integration',
      triage: triaged.triage,
      rationale: triaged.triage.rationale,
    };
  }

  const result = await llm.generate({ prompt, context });
  if (!isObjectBody(result.config)) {
    return {
      proposed: false,
      error: 'no_proposal',
      triage: triaged.triage,
      rationale: result.rationale,
    };
  }
  const version = await store.saveDraft(ref, result.config);
  const validation = await validateArtifactVersion(store, ref, version);
  return {
    proposed: true,
    version,
    validation,
    triage: triaged.triage,
    rationale: result.rationale,
  };
}
