import { describe, it, expect, vi } from 'vitest';
import { container } from 'tsyringe';
import type { ExecutionContext, MockProfile } from '@yukilabs/agnostic-ui-core';
import { CoreMockGateway } from '../infra/gateway/mock/CoreMockGateway';
import { MockGatewayError } from '../infra/gateway/mock/MockGatewayError';
import { SLOW_PROFILE_DELAY_MS } from '../infra/gateway/mock/withProfile';
import { EXECUTION_CONTEXT_TOKEN } from '../infra/di/tokens';
import { getBalanceMock, getBalanceMockEmpty } from '../infra/gateway/mock/fixtures';

function gatewayFor(ctx: ExecutionContext): CoreMockGateway {
  const child = container.createChildContainer();
  child.registerInstance(EXECUTION_CONTEXT_TOKEN, ctx);
  return child.resolve(CoreMockGateway);
}

const sandboxCtx = (mockProfile: MockProfile): ExecutionContext => ({
  mode: 'sandbox',
  tenantId: 'partnerco',
  customerId: 'cus_test_happyPath_partnerco',
  mockProfile,
});

const liveCtx = (): ExecutionContext => ({
  mode: 'live',
  tenantId: 'partnerco',
  customerId: 'cus_123',
});

describe('CoreMockGateway', () => {
  it('returns the happyPath fixture for the happyPath profile', async () => {
    await expect(gatewayFor(sandboxCtx('happyPath')).getBalance()).resolves.toEqual(
      getBalanceMock(),
    );
  });

  it('returns the explicit empty fixture for the empty profile', async () => {
    await expect(gatewayFor(sandboxCtx('empty')).getBalance()).resolves.toEqual(
      getBalanceMockEmpty(),
    );
  });

  it('falls back to happyPath with a warning when an op has no empty fixture', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(gatewayFor(sandboxCtx('empty')).getInvestFlow()).resolves.toMatchObject({
      flowId: 'flow_invest_default',
    });
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toContain('getInvestFlow');
    warn.mockRestore();
  });

  it('rejects with MockGatewayError carrying the operation for the error profile', async () => {
    const gateway = gatewayFor(sandboxCtx('error'));
    await expect(gateway.getBalance()).rejects.toBeInstanceOf(MockGatewayError);
    await expect(gateway.getBalance()).rejects.toMatchObject({
      code: 'mock_gateway_error',
      operation: 'getBalance',
    });
  });

  it('delays then returns happyPath for the slow profile', async () => {
    vi.useFakeTimers();
    try {
      const pending = gatewayFor(sandboxCtx('slow')).getBalance();
      let settled = false;
      void pending.then(() => {
        settled = true;
      });
      await vi.advanceTimersByTimeAsync(SLOW_PROFILE_DELAY_MS - 1);
      expect(settled).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      await expect(pending).resolves.toEqual(getBalanceMock());
    } finally {
      vi.useRealTimers();
    }
  });

  it('resolves happyPath in live mode (no mockProfile) bound to a mock dataSource', async () => {
    await expect(gatewayFor(liveCtx()).getBalance()).resolves.toEqual(getBalanceMock());
  });
});
