import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';
import { describe, expect, it } from 'vitest';

import { buildScope, createFlowContext, resolveProfile, writeOutput } from '../context';

const sandbox: ExecutionContext = {
  mode: 'sandbox',
  tenantId: 'partnerco',
  customerId: 'cus_1',
  mockProfile: 'slow',
};

const live: ExecutionContext = {
  mode: 'live',
  tenantId: 'partnerco',
  customerId: 'cus_real',
};

describe('resolveProfile', () => {
  it('returns the mock profile in sandbox mode', () => {
    expect(resolveProfile(sandbox)).toBe('slow');
  });

  it('returns undefined in live mode', () => {
    expect(resolveProfile(live)).toBeUndefined();
  });
});

describe('flow context', () => {
  it('writeOutput accumulates step results', () => {
    const ctx = createFlowContext(live, { customerId: 'cus_1' });
    writeOutput(ctx, 'balance', { netWorth: 10 });
    expect(ctx.outputs.balance).toEqual({ netWorth: 10 });
  });

  it('buildScope merges input and outputs flat, with outputs winning', () => {
    const ctx = createFlowContext(live, { customerId: 'cus_1', shared: 'in' });
    writeOutput(ctx, 'balance', { netWorth: 10 });
    writeOutput(ctx, 'shared', 'out');

    const scope = buildScope(ctx);
    expect(scope.customerId).toBe('cus_1');
    expect(scope.balance).toEqual({ netWorth: 10 });
    expect(scope.shared).toBe('out');
  });

  it('buildScope exposes a reserved $auth namespace', () => {
    const ctx = createFlowContext(sandbox, {});
    expect(buildScope(ctx).$auth).toEqual({
      tenantId: 'partnerco',
      customerId: 'cus_1',
      mode: 'sandbox',
    });
  });
});
