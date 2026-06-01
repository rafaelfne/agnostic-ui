import { describe, expect, it, vi } from 'vitest';
import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';
import type { ILogger } from '../application/ports';
import { PostInvestAmountUseCase } from '../application/useCases';
import { PostInvestAmountController } from '../interface';
import { MockGatewayError } from '../infra/gateway/mock';

function fakeLogger(): ILogger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

function sandboxCtx(customerId = 'cus_test_happyPath_partnerco'): ExecutionContext {
  return { mode: 'sandbox', tenantId: 'partnerco', customerId, mockProfile: 'happyPath' };
}

function controller(
  execute: (input: unknown) => Promise<unknown>,
  ctx: ExecutionContext = sandboxCtx(),
): PostInvestAmountController {
  const useCase = { execute: vi.fn(execute) } as unknown as PostInvestAmountUseCase;
  return new PostInvestAmountController(useCase, ctx, fakeLogger());
}

function postReq(body: unknown, raw = false): Request {
  return new Request('https://bff.test/api/invest/amount', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

describe('PostInvestAmountController', () => {
  it('returns 200 and forwards the validated body, with customerId from the context', async () => {
    const fixture = { orderId: 'ord_1', status: 'accepted' };
    const execute = vi.fn(async () => fixture);
    const useCase = { execute } as unknown as PostInvestAmountUseCase;
    const ctrl = new PostInvestAmountController(useCase, sandboxCtx('cus_ctx'), fakeLogger());

    const response = await ctrl.handle(
      postReq({ productId: 'prd_1', amount: 100, customerId: 'spoofed' }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(fixture);
    expect(execute).toHaveBeenCalledWith({
      productId: 'prd_1',
      amount: 100,
      customerId: 'cus_ctx',
    });
  });

  it('returns 422 when amount is not positive', async () => {
    const execute = vi.fn();
    const useCase = { execute } as unknown as PostInvestAmountUseCase;
    const ctrl = new PostInvestAmountController(useCase, sandboxCtx(), fakeLogger());

    const response = await ctrl.handle(postReq({ productId: 'prd_1', amount: -5 }));

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ error: 'Validation failed' });
    expect(execute).not.toHaveBeenCalled();
  });

  it('returns 422 when productId is missing', async () => {
    const response = await controller(async () => ({})).handle(postReq({ amount: 100 }));
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ error: 'Validation failed' });
  });

  it('returns 422 for a malformed JSON body', async () => {
    const response = await controller(async () => ({})).handle(postReq('not json', true));
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ error: 'Validation failed' });
  });

  it('maps MockGatewayError to 500 mock_gateway_error', async () => {
    const response = await controller(async () => {
      throw new MockGatewayError('postInvestAmount');
    }).handle(postReq({ productId: 'prd_1', amount: 100 }));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'mock_gateway_error' });
  });
});
