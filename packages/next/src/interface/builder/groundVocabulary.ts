import {
  buildCoreGovernedRegistry,
  contractRefToString,
  type OperatorContract,
} from '@yukilabs/agnostic-ui-engine';

import type {
  ConfigArtifactRef,
  ConfigArtifactSummary,
  IConfigStore,
} from '../../application/ports';

/** A `description` opcional do JSON Schema de I/O do contrato (dado opaco, só leitura). */
function schemaDescription(schema: OperatorContract['input']): string {
  const description = (schema as { description?: unknown }).description;
  return typeof description === 'string' ? description : '';
}

/** Uma linha por operador: ref + capacidades (drivers de tier/egress) + I/O. Sem handler. */
function describeOperator(contract: OperatorContract): string {
  const tags: string[] = [];
  if (contract.capabilities.pure) tags.push('pure');
  if (contract.capabilities.integrations.length > 0) tags.push('integrations');
  if (contract.capabilities.secrets.length > 0) tags.push('secrets');
  if (contract.capabilities.emits.length > 0)
    tags.push(`emits ${contract.capabilities.emits.join('/')}`);
  if (!contract.effects.reversible) tags.push('irreversible');
  const suffix = tags.length > 0 ? ` [${tags.join(', ')}]` : '';
  return `- ${contractRefToString(contract.ref)}${suffix}: in=${schemaDescription(contract.input)}; out=${schemaDescription(contract.output)}`;
}

/**
 * Sanitiza um label controlado pelo tenant (slug) antes de embuti-lo no system prompt:
 * troca tudo fora de `[A-Za-z0-9._-]` por `?` e limita o tamanho. Defesa em
 * profundidade contra injeção estrutural de prompt — um slug com newline/`#` não
 * consegue "quebrar a linha" do grounding. (A escalação já é barrada pelo portão
 * fail-closed + never-publish; isto fecha a superfície de uma vez.)
 */
function safeLabel(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, '?').slice(0, 64);
}

/** Uma linha por artefato: slug + estado. NUNCA o body (logo, nenhum secret-ref). */
function describeArtifact(summary: ConfigArtifactSummary): string {
  const state =
    summary.publishedVersion !== null
      ? `published v${summary.publishedVersion}`
      : `draft v${summary.latestVersion}`;
  return `- ${safeLabel(summary.slug)} (${state})`;
}

function section(title: string, lines: string[], empty: string): string {
  return `# ${title}\n${lines.length > 0 ? lines.join('\n') : empty}`;
}

/**
 * Monta o grounding (system prompt) da IA-como-editor (I.2, ADR 0006), **tenant-scoped**.
 * Descreve o vocabulário contra o qual a IA gera: os operadores disponíveis, as
 * integrações declaradas DO TENANT e os artefatos existentes DO TENANT do mesmo kind.
 *
 * Fronteira de secret (guardrail duro, ADR 0002 §7): usa **apenas `listArtifacts`
 * (summaries, sem body)** — nenhum valor NEM ref de secret entra no context; e o
 * `tenantId` (da sessão verificada, carregado no `ref`) escopa todas as queries, então
 * o grounding do tenant A nunca inclui nada do B. A fonte do vocabulário de operadores
 * fica atrás de `buildCoreGovernedRegistry` — ponto de troca para um registry de tenant
 * (`<tenant>.*`) quando extensões namespaced existirem.
 */
export async function buildGroundVocabulary(
  store: IConfigStore,
  ref: ConfigArtifactRef,
): Promise<string> {
  const registry = buildCoreGovernedRegistry();
  const operators = registry
    .refs()
    .sort((a, b) => a.localeCompare(b))
    .map((opRef) => registry.resolve(opRef)?.contract)
    .filter((contract): contract is OperatorContract => contract !== undefined)
    .map(describeOperator);

  // Quando o alvo já é uma integração, a seção de integrações É a de "existentes":
  // não consulta nem lista duas vezes (evita duplicar conteúdo/queries).
  const integrations = await store.listArtifacts(ref.tenantId, 'integration');
  const sameKind =
    ref.kind === 'integration' ? integrations : await store.listArtifacts(ref.tenantId, ref.kind);

  const sections = [
    'You are an editor for a Server-Driven UI platform. Produce ONLY the JSON config for the requested artifact, valid against its schema, using only the vocabulary below.',
    `# Target\nkind: ${ref.kind}; slug: ${safeLabel(ref.slug)}`,
    section('Operators (flow steps)', operators, '(none)'),
    section(
      'Integrations available to this tenant',
      integrations.map(describeArtifact),
      '(none yet)',
    ),
  ];
  if (ref.kind !== 'integration') {
    sections.push(
      section(`Existing ${ref.kind} artifacts`, sameKind.map(describeArtifact), '(none yet)'),
    );
  }
  sections.push(
    '# Guardrails\n- Reference integrations and secrets by name only; never inline secret values.\n- Use only the operators listed above.',
  );
  return sections.join('\n\n');
}
