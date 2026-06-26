import { z } from 'zod';

/**
 * Contratos de extensão (ADR 0006). O contrato é DADO serializável: IA, builder e
 * validador raciocinam sobre ele **sem executar** a implementação, ligada por `ref`
 * e checada por conformância. Vive no `core` (shared kernel) para ser consumido pelo
 * `engine`, pelos renderers e — via `gen:schema` — pelo contrato Dart.
 */

/**
 * Um JSON Schema tratado como DADO (Decisão #1 do ADR 0006): `input`/`output`/`props`
 * de contrato são JSON Schema — a mesma representação que o codegen Zod→JSON Schema já
 * emite. Aqui é um objeto JSON opaco, não interpretado.
 */
export const JsonSchemaSchema = z.record(z.unknown());
export type JsonSchema = z.infer<typeof JsonSchemaSchema>;

const NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

/** Ref namespaced de uma extensão: `<namespace>.<name>@<version>`. */
export const ContractRefSchema = z.object({
  namespace: z.string().regex(NAME_PATTERN),
  name: z.string().regex(NAME_PATTERN),
  version: z.number().int().positive(),
});
export type ContractRef = z.infer<typeof ContractRefSchema>;

/**
 * O que um operador PRECISA. Sem egress cru: `integrations` são refs a uma
 * `IntegrationDefinition` (ADR 0003); o engine concede só o declarado (G4).
 */
export const OperatorCapabilitiesSchema = z.object({
  pure: z.boolean().default(false),
  integrations: z.array(z.string()).default([]),
  secrets: z.array(z.string()).default([]),
  emits: z.array(z.string()).default([]),
});
export type OperatorCapabilities = z.infer<typeof OperatorCapabilitiesSchema>;

/** O que um operador FAZ. `reversible:false` é o que deriva o tier `critical` (G5). */
export const OperatorEffectsSchema = z.object({
  reads: z.array(z.string()).default([]),
  writes: z.array(z.string()).default([]),
  idempotent: z.boolean().default(true),
  reversible: z.boolean().default(true),
  compensation: z.string().optional(),
});
export type OperatorEffects = z.infer<typeof OperatorEffectsSchema>;

export const OperatorContractSchema = z.object({
  ref: ContractRefSchema,
  input: JsonSchemaSchema,
  output: JsonSchemaSchema,
  capabilities: OperatorCapabilitiesSchema,
  effects: OperatorEffectsSchema,
});
export type OperatorContract = z.infer<typeof OperatorContractSchema>;

// --- Helpers de ref (formato faz parte da spec do contrato) ----------------

const REF_PATTERN = /^([a-z][a-z0-9-]*)\.([a-z][a-z0-9-]*)@(\d+)$/;
const CORE_NAMESPACE = 'core';
const CORE_VERSION = 1;

export function contractRefToString(ref: ContractRef): string {
  return `${ref.namespace}.${ref.name}@${ref.version}`;
}

/** `core.validate@1` → ref; entrada inválida → `undefined`. */
export function parseContractRef(value: string): ContractRef | undefined {
  const match = REF_PATTERN.exec(value);
  if (match === null) return undefined;
  const [, namespace, name, version] = match;
  if (namespace === undefined || name === undefined || version === undefined) {
    return undefined;
  }
  return { namespace, name, version: Number(version) };
}

/**
 * Normaliza um `op` literal (`validate`, `compose-template`) para o ref core
 * (`core.validate@1`) — back-compat com o vocabulário fechado — ou aceita um ref
 * namespaced já formado. Entrada inválida → `undefined`.
 */
export function normalizeContractRef(opOrRef: string): ContractRef | undefined {
  const parsed = parseContractRef(opOrRef);
  if (parsed !== undefined) return parsed;
  if (NAME_PATTERN.test(opOrRef)) {
    return { namespace: CORE_NAMESPACE, name: opOrRef, version: CORE_VERSION };
  }
  return undefined;
}

export function coreContractRef(name: string): ContractRef {
  return { namespace: CORE_NAMESPACE, name, version: CORE_VERSION };
}
