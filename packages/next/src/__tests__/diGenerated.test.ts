import { describe, expect, it } from 'vitest';
import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';
import { GetBalanceUseCase } from '../application/useCases';
import { BalanceController } from '../interface/controllers';
import { container } from '../infra/di/container';
import { createRequestContainer } from '../infra/di';
import * as generatedTokens from '../infra/di/generated/tokens';
import { BALANCE_CONTROLLER_TOKEN, GET_BALANCE_USE_CASE_TOKEN } from '../infra/di/generated/tokens';
import { getBalanceMock } from '../infra/gateway/mock/fixtures';

// partnerco is `dataSource: 'mock'`, so a live request binds the mock gateway (default
// happyPath profile) — the same wiring `container.test.ts` relies on.
const ctx: ExecutionContext = { mode: 'live', tenantId: 'partnerco', customerId: 'cus_123' };

describe('generated DI registry', () => {
  it('registers every generated token on the root container', () => {
    const tokens = Object.values(generatedTokens).filter(
      (value): value is symbol => typeof value === 'symbol',
    );
    expect(tokens.length).toBeGreaterThanOrEqual(34);
    for (const token of tokens) {
      expect(container.isRegistered(token)).toBe(true);
    }
  });

  it('resolves a use case by token from the request child, wired to the child gateway', async () => {
    const requestContainer = createRequestContainer(ctx, 'tok');
    const useCase = requestContainer.resolve(GET_BALANCE_USE_CASE_TOKEN);
    expect(useCase).toBeInstanceOf(GetBalanceUseCase);
    await expect(useCase.execute({ customerId: ctx.customerId })).resolves.toEqual(
      getBalanceMock(),
    );
  });

  it('resolves a controller by token from the request child and handles the request', async () => {
    const requestContainer = createRequestContainer(ctx, 'tok');
    const controller = requestContainer.resolve(BALANCE_CONTROLLER_TOKEN);
    expect(controller).toBeInstanceOf(BalanceController);
    const response = await controller.handle(new Request('https://bff.test/api/balance'));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(getBalanceMock());
  });

  it('builds a fresh (transient) instance per resolve', () => {
    const requestContainer = createRequestContainer(ctx, 'tok');
    const first = requestContainer.resolve(BALANCE_CONTROLLER_TOKEN);
    const second = requestContainer.resolve(BALANCE_CONTROLLER_TOKEN);
    expect(first).not.toBe(second);
  });
});
