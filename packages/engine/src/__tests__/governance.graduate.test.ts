import { OperatorContractSchema } from '@yukilabs/agnostic-ui-core';
import { describe, expect, it } from 'vitest';

import { buildCoreGovernedRegistry } from '../governance';
import type { StepDef } from '../schemas';

function extContract(namespace: string, name: string, fixtures: string[], version = 1) {
  return OperatorContractSchema.parse({
    ref: { namespace, name, version },
    input: {},
    output: {},
    capabilities: { pure: true },
    effects: {},
    conformance: { fixtures },
  });
}

describe('J.1 — graduação no registry governado (ADR 0006 §7)', () => {
  it('gradua uma extensão provada p/ core.*, reusando o handler; o ref original permanece', () => {
    const registry = buildCoreGovernedRegistry();
    registry.registerCertified<StepDef>(
      extContract('acme', 'discount', ['acme/discount.ok']),
      () => {},
    );
    const before = registry.resolve('acme.discount@1');

    expect(registry.graduate('acme.discount@1')).toEqual({ ok: true, ref: 'core.discount@1' });

    const graduated = registry.resolve('core.discount@1');
    expect(graduated?.contract.ref).toEqual({ namespace: 'core', name: 'discount', version: 1 });
    expect(graduated?.handler).toBe(before?.handler); // mesmo handler, reusado
    expect(registry.resolve('acme.discount@1')).toBeDefined(); // original não removido
  });

  it('reseta a versão p/ @1 ao graduar (acme.promo@2 → core.promo@1)', () => {
    const registry = buildCoreGovernedRegistry();
    registry.registerCertified<StepDef>(
      extContract('acme', 'promo', ['acme/promo.ok'], 2),
      () => {},
    );
    expect(registry.graduate('acme.promo@2')).toEqual({ ok: true, ref: 'core.promo@1' });
    expect(registry.resolve('core.promo@1')).toBeDefined();
  });

  it('recusa graduar uma extensão experimental (sem fixtures) — fail-closed', () => {
    const registry = buildCoreGovernedRegistry();
    registry.register<StepDef>(extContract('acme', 'raw', []), () => {});
    expect(registry.graduate('acme.raw@1')).toEqual({ ok: false, reason: 'not_proven' });
  });

  it('recusa graduar um op já core, ou um ref desconhecido', () => {
    const registry = buildCoreGovernedRegistry();
    expect(registry.graduate('validate')).toEqual({ ok: false, reason: 'already_core' });
    expect(registry.graduate('nope.x@1')).toEqual({ ok: false, reason: 'unknown' });
  });

  it('recusa graduar quando o core.<name> já existe (colisão)', () => {
    const registry = buildCoreGovernedRegistry();
    // 'validate' colide com o core.validate@1 já registrado.
    registry.registerCertified<StepDef>(
      extContract('acme', 'validate', ['acme/validate.ok']),
      () => {},
    );
    expect(registry.graduate('acme.validate@1')).toEqual({ ok: false, reason: 'core_collision' });
  });
});
