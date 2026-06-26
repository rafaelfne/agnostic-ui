import { type ComponentContract, validateComponentProps } from '@yukilabs/agnostic-ui-core';

/**
 * Mapa `TemplateNode.type` → `ComponentContract` (ADR 0006, G6). O props schema do
 * contrato é a interface da IA: o registry expõe o schema dos componentes registrados,
 * e o renderer pode validar props contra ele (opt-in, não-fatal).
 */
export type ComponentContractRegistry = Record<string, ComponentContract>;

/** Indexa contratos pelo tipo do componente (`ref.name`, convenção dos componentes core). */
export function createComponentContracts(
  contracts: readonly ComponentContract[],
): ComponentContractRegistry {
  const registry: ComponentContractRegistry = {};
  for (const contract of contracts) registry[contract.ref.name] = contract;
  return registry;
}

/** Valida props resolvidas contra o contrato do tipo; `[]` quando não há contrato. */
export function validateNodeProps(
  contracts: ComponentContractRegistry,
  type: string,
  props: Record<string, unknown>,
): string[] {
  const contract = contracts[type];
  return contract === undefined ? [] : validateComponentProps(contract, props);
}
