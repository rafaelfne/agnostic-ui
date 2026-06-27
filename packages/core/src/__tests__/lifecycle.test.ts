import { describe, expect, it } from 'vitest';

import { canGraduate, graduateContract, isCoreRef, maturityLevel } from '../conformance';
import { ComponentContractSchema, OperatorContractSchema } from '../schemas';

function op(namespace: string, name: string, fixtures: string[], version = 1) {
  return OperatorContractSchema.parse({
    ref: { namespace, name, version },
    input: {},
    output: {},
    capabilities: {},
    effects: {},
    conformance: { fixtures },
  });
}

function component(namespace: string, name: string, fixtures: string[]) {
  return ComponentContractSchema.parse({
    ref: { namespace, name, version: 1 },
    props: {},
    renderOnly: true,
    conformance: { fixtures },
  });
}

describe('J.1 — maturidade + graduação (ADR 0006 §7)', () => {
  it('deriva a maturidade do namespace + certificação', () => {
    expect(maturityLevel(op('core', 'validate', []))).toBe('core');
    expect(maturityLevel(op('acme', 'discount', ['acme/discount.ok']))).toBe('proven');
    expect(maturityLevel(op('acme', 'discount', []))).toBe('experimental');
  });

  it('só `proven` (namespaced + certificada) pode graduar', () => {
    expect(canGraduate(op('acme', 'discount', ['f']))).toBe(true);
    expect(canGraduate(op('acme', 'discount', []))).toBe(false); // experimental
    expect(canGraduate(op('core', 'validate', ['f']))).toBe(false); // já core
  });

  it('gradua p/ core.<name>@1 (entra como built-in), preservando o resto, sem mutar o original', () => {
    const ext = op('acme', 'discount', ['acme/discount.ok'], 3);
    const outcome = graduateContract(ext);
    expect(outcome.graduated).toBe(true);
    if (outcome.graduated) {
      // versão reseta p/ @1 — alcançável pelo nome bare como os ops core originais
      expect(outcome.contract.ref).toEqual({ namespace: 'core', name: 'discount', version: 1 });
      expect(isCoreRef(outcome.contract.ref)).toBe(true);
      expect(outcome.contract.conformance.fixtures).toEqual(['acme/discount.ok']);
    }
    // imutável: o contrato de entrada não muda
    expect(ext.ref).toEqual({ namespace: 'acme', name: 'discount', version: 3 });
  });

  it('recusa fail-closed: já-core e não-provada', () => {
    expect(graduateContract(op('core', 'validate', ['f']))).toMatchObject({
      graduated: false,
      reason: 'already_core',
    });
    expect(graduateContract(op('acme', 'x', []))).toMatchObject({
      graduated: false,
      reason: 'not_proven',
    });
  });

  it('vale também para ComponentContract (lógica contract-agnóstica)', () => {
    expect(maturityLevel(component('acme', 'chip', []))).toBe('experimental');
    expect(maturityLevel(component('acme', 'chip', ['acme/chip.ok']))).toBe('proven');
    const outcome = graduateContract(component('acme', 'chip', ['acme/chip.ok']));
    expect(outcome.graduated).toBe(true);
    if (outcome.graduated) {
      expect(outcome.contract.ref).toEqual({ namespace: 'core', name: 'chip', version: 1 });
      expect(outcome.contract.renderOnly).toBe(true); // resto do contrato preservado
    }
  });

  it('uma fixture só-espaço NÃO certifica: o schema rejeita IDs vazios (fecha o bypass)', () => {
    expect(
      OperatorContractSchema.safeParse({
        ref: { namespace: 'acme', name: 'x', version: 1 },
        input: {},
        output: {},
        capabilities: {},
        effects: {},
        conformance: { fixtures: ['   '] },
      }).success,
    ).toBe(false);
    expect(
      OperatorContractSchema.safeParse({
        ref: { namespace: 'acme', name: 'x', version: 1 },
        input: {},
        output: {},
        capabilities: {},
        effects: {},
        conformance: { fixtures: [''] },
      }).success,
    ).toBe(false);
  });
});
