import { describe, expect, it } from 'vitest';

import {
  ComponentContractSchema,
  validateComponentProps,
  validatePropsAgainstSchema,
} from '../schemas';

const schema = {
  type: 'object',
  required: ['value'],
  properties: { value: { type: 'string' }, count: { type: 'number' } },
};

describe('validação de props de componente (ADR 0006, G6)', () => {
  it('required ausente → problema; presente → ok', () => {
    expect(validatePropsAgainstSchema(schema, { value: 'hi' })).toEqual([]);
    expect(validatePropsAgainstSchema(schema, {})).toEqual(['missing required prop: value']);
  });

  it('tipo primitivo errado → problema; certo → ok', () => {
    expect(validatePropsAgainstSchema(schema, { value: 'hi', count: 'no' })).toEqual([
      'prop count: expected number',
    ]);
    expect(validatePropsAgainstSchema(schema, { value: 'hi', count: 3 })).toEqual([]);
  });

  it('validateComponentProps usa o props schema do contrato', () => {
    const contract = ComponentContractSchema.parse({
      ref: { namespace: 'core', name: 'text', version: 1 },
      props: schema,
      renderOnly: true,
    });
    expect(validateComponentProps(contract, {})).toEqual(['missing required prop: value']);
    expect(validateComponentProps(contract, { value: 'hi' })).toEqual([]);
  });
});
