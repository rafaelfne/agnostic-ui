import { describe, expect, it, vi } from 'vitest';
import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';
import type { ILogger } from '../application/ports';
import { GetBalanceUseCase } from '../application/useCases';
import { BalanceController } from '../interface';
import { MockGatewayError } from '../infra/gateway/mock';

function fakeLogger(): ILogger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

function sandboxCtx(customerId = 'cus_test_happyPath_partnerco'): ExecutionContext {
  return { mode: 'sandbox', tenantId: 'partnerco', customerId, mockProfile: 'happyPath' };
}

function controller(
  execute: () => Promise<unknown>,
  ctx: ExecutionContext = sandboxCtx(),
): BalanceController {
  const useCase = { execute: vi.fn(execute) } as unknown as GetBalanceUseCase;
  return new BalanceController(useCase, ctx, fakeLogger());
}

const req = (): Request => new Request('https://bff.test/api/balance');

describe('BalanceController', () => {
  it('returns 200 with the use case result', async () => {
    const fixture = { netWorth: 12_500_000, currency: 'BRL' };
    const response = await controller(async () => fixture).handle(req());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(fixture);
  });

  it('maps MockGatewayError to 500 mock_gateway_error', async () => {
    const response = await controller(async () => {
      throw new MockGatewayError('getBalance');
    }).handle(req());
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'mock_gateway_error' });
  });

  it('maps an unexpected error to 500 internal', async () => {
    const response = await controller(async () => {
      throw new Error('boom');
    }).handle(req());
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Internal server error' });
  });

  it('returns 422 when the input fails validation', async () => {
    const response = await controller(async () => ({}), sandboxCtx('')).handle(req());
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ error: 'Validation failed' });
  });
});
