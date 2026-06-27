import type { ConfigArtifactRef, IConfigStore, ILlm } from '../../application/ports';
import { type ArtifactValidationOutcome, validateArtifactVersion } from '../../infra/store';

import { buildGroundVocabulary } from './groundVocabulary';

export interface ProposeOutcome {
  proposed: boolean;
  version?: number;
  validation?: ArtifactValidationOutcome;
  rationale: string;
  /** Por que não houve proposta: a IA não devolveu um objeto de config parseável. */
  error?: 'no_proposal';
}

function isObjectBody(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Pipeline da proposta da IA (Frente I, ADR 0006): prompt → `ILlm` → draft → validação
 * **sem** publicar. A IA é só mais um editor — sua geração passa pelo MESMO portão
 * (`validateArtifactVersion`) e o MESMO store, e **nunca** publica. Uma proposta
 * inválida vira draft com motivo fail-closed, revisável, não publicado; uma config
 * não-parseável nem vira draft. O `context` é o grounding tenant-scoped (I.2): o
 * vocabulário (operadores + integrações + artefatos DO TENANT), sem valor de secret.
 */
export async function proposeArtifactVersion(
  store: IConfigStore,
  llm: ILlm,
  ref: ConfigArtifactRef,
  prompt: string,
): Promise<ProposeOutcome> {
  const context = await buildGroundVocabulary(store, ref);
  const result = await llm.generate({ prompt, context });
  if (!isObjectBody(result.config)) {
    return { proposed: false, rationale: result.rationale, error: 'no_proposal' };
  }
  const version = await store.saveDraft(ref, result.config);
  const validation = await validateArtifactVersion(store, ref, version);
  return { proposed: true, version, validation, rationale: result.rationale };
}
