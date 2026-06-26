/**
 * Contrato declarativo de operador (ADR 0006). O contrato é DADO serializável
 * sobre o qual IA, builder e validador raciocinam sem executar a implementação.
 *
 * G1 (spike strangler) fixa só a `ref` e o registry governado por lookup — a
 * auditoria migra de `buildDefaultRegistry` para o tripé contrato + conformância
 * + sandbox. `input`/`output` (JSON Schema), `capabilities` e `effects` chegam em
 * G2/G4/G5.
 */

/** Ref namespaced de um operador: `<namespace>.<name>@<version>`. */
export interface OperatorRef {
  namespace: string;
  name: string;
  version: number;
}

export interface OperatorContract {
  ref: OperatorRef;
}

const CORE_NAMESPACE = 'core';
const CORE_VERSION = 1;
const BARE_OP_PATTERN = /^[a-z][a-z0-9-]*$/;
const REF_PATTERN = /^([a-z][a-z0-9-]*)\.([a-z][a-z0-9-]*)@(\d+)$/;

export function refToString(ref: OperatorRef): string {
  return `${ref.namespace}.${ref.name}@${ref.version}`;
}

/** `core.validate@1` → ref; entrada inválida → `undefined`. */
export function parseRef(value: string): OperatorRef | undefined {
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
 * (`core.validate@1`) — back-compat com o vocabulário fechado atual — ou aceita um
 * ref namespaced já formado. Entrada inválida → `undefined`.
 */
export function normalizeOpToRef(opOrRef: string): OperatorRef | undefined {
  const parsed = parseRef(opOrRef);
  if (parsed !== undefined) return parsed;
  if (BARE_OP_PATTERN.test(opOrRef)) {
    return { namespace: CORE_NAMESPACE, name: opOrRef, version: CORE_VERSION };
  }
  return undefined;
}

export function coreRef(name: string): OperatorRef {
  return { namespace: CORE_NAMESPACE, name, version: CORE_VERSION };
}
