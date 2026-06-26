/**
 * SKETCH (não-produção) — Contrato de capability de operador/componente.
 *
 * Prova executável do modelo de extensão do ADR 0006: o contrato é DADO
 * serializável sobre o qual IA, builder e validador raciocinam SEM executar a
 * implementação. Uma única declaração (este contrato) policia o runtime (sandbox
 * de capabilities), instrui a IA (review summary) e gera o diff de intenção.
 *
 * Decisão #1 do ADR: `input`/`output` são JSON Schema (mesma representação que o
 * `Zod → JSON Schema` já gera para o contrato Dart). Aqui o JSON Schema é tratado
 * como dado opaco (`JsonSchema`), não como Zod em runtime.
 *
 * Este arquivo é ilustrativo: vive em `docs/`, fora dos pacotes publicados.
 */
import { z } from 'zod';

/** JSON Schema tratado como dado (não interpretado aqui). */
const JsonSchema = z.record(z.string(), z.unknown());

/** Ref namespaced: `<namespace>.<name>@<version>` (namespace `core` ou `<tenant>`). */
const RefSchema = z.object({
  namespace: z.string().regex(/^[a-z][a-z0-9-]*$/),
  name: z.string().regex(/^[a-z][a-z0-9-]*$/),
  version: z.number().int().positive(),
});

/**
 * O que o operador PRECISA. Sem egress cru: integrações são refs a uma
 * `IntegrationDefinition` (ADR 0003), reusando egress-guardian/secret-ref.
 */
const CapabilitiesSchema = z.object({
  pure: z.boolean().default(false),
  integrations: z.array(z.string()).default([]),
  secrets: z.array(z.string()).default([]),
  emits: z.array(z.string()).default([]),
  limits: z.object({ timeoutMs: z.number().int().positive().optional() }).optional(),
});

/** O que o operador FAZ. `reversible:false` é o que dispara o tier `critical`. */
const EffectsSchema = z.object({
  reads: z.array(z.string()).default([]),
  writes: z.array(z.string()).default([]),
  idempotent: z.boolean().default(true),
  reversible: z.boolean().default(true),
  compensation: z.string().optional(),
});

const ConformanceSchema = z.object({
  fixtures: z.array(z.string()).min(1),
});

export const OperatorContractSchema = z.object({
  kind: z.literal('operator'),
  ref: RefSchema,
  input: JsonSchema,
  output: JsonSchema,
  capabilities: CapabilitiesSchema,
  effects: EffectsSchema,
  conformance: ConformanceSchema,
});

export const ComponentContractSchema = z.object({
  kind: z.literal('component'),
  ref: RefSchema,
  // props schema é Zod → JSON Schema (a interface nativa da IA).
  props: JsonSchema,
  // componente roda em sandbox render-only: sem I/O, sem segredo, sem egress.
  renderOnly: z.literal(true),
  conformance: ConformanceSchema,
});

export type OperatorContract = z.infer<typeof OperatorContractSchema>;
export type ComponentContract = z.infer<typeof ComponentContractSchema>;

/** Tier DERIVADO das capabilities/efeitos — nunca declarado (um campo manual mente). */
export type TrustTier = 'safe' | 'sensitive' | 'critical';

export function deriveTrustTier(c: OperatorContract): TrustTier {
  if (c.effects.reversible === false) return 'critical';
  if (c.capabilities.integrations.length > 0 || c.capabilities.secrets.length > 0)
    return 'sensitive';
  if (c.capabilities.pure) return 'safe';
  return 'sensitive';
}

/** O MESMO contrato gera o resumo de revisão humana — diff de intenção, não JSON cru. */
export function renderReviewSummary(c: OperatorContract): string {
  const tier = deriveTrustTier(c);
  const lines = [
    `${c.ref.namespace}.${c.ref.name}@${c.ref.version} — tier: ${tier}`,
    `egress: ${c.capabilities.integrations.join(', ') || 'nenhum'}`,
    `secrets: ${c.capabilities.secrets.join(', ') || 'nenhum'}`,
    `escreve: ${c.effects.writes.join(', ') || 'nada'}`,
    `reversível: ${c.effects.reversible}`,
  ];
  if (tier === 'critical') {
    lines.push('⚠ irreversível — exige pré-flight humano (guardrail CLAUDE.md).');
  }
  return lines.join('\n');
}

// --- Exemplos -------------------------------------------------------------

/** `core.validate` é puro → safe; cerimônia nenhuma além do RFC do core. */
export const coreValidate: OperatorContract = {
  kind: 'operator',
  ref: { namespace: 'core', name: 'validate', version: 1 },
  input: { type: 'object' },
  output: { type: 'object' },
  capabilities: {
    pure: true,
    integrations: [],
    secrets: [],
    emits: [],
  },
  effects: { reads: [], writes: [], idempotent: true, reversible: true },
  conformance: { fixtures: ['core/validate.basic'] },
};

/** Slide 13 do blueprint: secrets + reversible:false → critical → pré-flight. */
export const acmeExecuteTransfer: OperatorContract = {
  kind: 'operator',
  ref: { namespace: 'acme', name: 'execute-transfer', version: 1 },
  input: { type: 'object', required: ['amount', 'to'] },
  output: { type: 'object', required: ['transferId'] },
  capabilities: {
    pure: false,
    integrations: ['acme-banking'],
    secrets: ['ACME_KEY'],
    emits: ['transfer.completed'],
  },
  effects: {
    reads: ['account.balance'],
    writes: ['account.ledger'],
    idempotent: false,
    reversible: false,
    compensation: 'acme.reverse-transfer',
  },
  conformance: { fixtures: ['acme/execute-transfer.happy'] },
};

// deriveTrustTier(coreValidate)        === "safe"
// deriveTrustTier(acmeExecuteTransfer) === "critical"
