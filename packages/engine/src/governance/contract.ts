/**
 * Contratos de extensão — fonte única no `core` (ADR 0006). G1 definia o
 * `OperatorContract` localmente; G2 o promove ao shared kernel (`core`) para ser
 * consumido pelo engine, pelos renderers e — via `gen:schema` — pelo contrato Dart.
 * Este módulo só re-exporta, mantendo os imports do engine estáveis.
 */
export {
  ComponentContractSchema,
  type ComponentContract,
  ContractRefSchema,
  type ContractRef,
  JsonSchemaSchema,
  type JsonSchema,
  OperatorCapabilitiesSchema,
  type OperatorCapabilities,
  OperatorContractSchema,
  type OperatorContract,
  OperatorEffectsSchema,
  type OperatorEffects,
  contractRefToString,
  coreContractRef,
  normalizeContractRef,
  parseContractRef,
} from '@yukilabs/agnostic-ui-core';
