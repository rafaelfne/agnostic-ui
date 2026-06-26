import { z } from 'zod';

import { ContractRefSchema, type JsonSchema, JsonSchemaSchema } from './operatorContract';

/**
 * Contrato de um componente (ADR 0006). O **props schema** é a interface nativa da
 * IA: o instante em que um dev registra um componente, a IA já o usa lendo o schema.
 * Roda num sandbox **render-only** — sem I/O, sem segredo, sem egress (enforcement
 * por renderer em G6).
 */
export const ComponentContractSchema = z.object({
  ref: ContractRefSchema,
  props: JsonSchemaSchema,
  renderOnly: z.literal(true),
});
export type ComponentContract = z.infer<typeof ComponentContractSchema>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function jsonTypeMatches(value: unknown, type: string): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
    case 'integer':
      return typeof value === 'number';
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return isRecord(value);
    default:
      return true;
  }
}

/**
 * Validação **dependency-free** de props contra um JSON Schema (tratado como dado):
 * presença de `required` + tipo primitivo das `properties` declaradas. Espelhada em
 * Dart (`validatePropsAgainstSchema`) — não substitui um validador JSON Schema
 * completo; é o gate barato que pega o erro de config comum. Nunca lança: retorna a
 * lista de problemas (a tela nunca quebra).
 */
export function validatePropsAgainstSchema(
  schema: JsonSchema,
  props: Record<string, unknown>,
): string[] {
  const issues: string[] = [];
  const { required, properties } = schema;
  if (Array.isArray(required)) {
    for (const name of required) {
      if (typeof name === 'string' && props[name] === undefined) {
        issues.push(`missing required prop: ${name}`);
      }
    }
  }
  if (isRecord(properties)) {
    for (const [name, spec] of Object.entries(properties)) {
      const value = props[name];
      if (value === undefined) continue;
      if (isRecord(spec) && typeof spec.type === 'string' && !jsonTypeMatches(value, spec.type)) {
        issues.push(`prop ${name}: expected ${spec.type}`);
      }
    }
  }
  return issues;
}

export function validateComponentProps(
  contract: ComponentContract,
  props: Record<string, unknown>,
): string[] {
  return validatePropsAgainstSchema(contract.props, props);
}
