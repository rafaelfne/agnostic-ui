import { describe, expect, it, vi } from 'vitest';
import type { ICoreGateway } from '../application/ports';
import {
  GetInvestFlowUseCase,
  GetInvestReviewUseCase,
  PostInvestAmountUseCase,
  PostInvestIntentionUseCase,
} from '../application/useCases';

describe('invest use cases', () => {
  it('GetInvestFlowUseCase proxies getInvestFlow', async () => {
    const output = { flowId: 'flow_1' };
    const gateway = { getInvestFlow: vi.fn().mockResolvedValue(output) } as unknown as ICoreGateway;
    const input = { customerId: 'cus_1' };

    await expect(new GetInvestFlowUseCase(gateway).execute(input)).resolves.toBe(output);
    expect(gateway.getInvestFlow).toHaveBeenCalledWith(input);
  });

  it('GetInvestReviewUseCase proxies getInvestReview', async () => {
    const output = { amount: 1 };
    const gateway = {
      getInvestReview: vi.fn().mockResolvedValue(output),
    } as unknown as ICoreGateway;
    const input = { customerId: 'cus_1' };

    await expect(new GetInvestReviewUseCase(gateway).execute(input)).resolves.toBe(output);
    expect(gateway.getInvestReview).toHaveBeenCalledWith(input);
  });

  it('PostInvestAmountUseCase proxies postInvestAmount', async () => {
    const output = { orderId: 'ord_1' };
    const gateway = {
      postInvestAmount: vi.fn().mockResolvedValue(output),
    } as unknown as ICoreGateway;
    const input = { customerId: 'cus_1', productId: 'prd_1', amount: 100 };

    await expect(new PostInvestAmountUseCase(gateway).execute(input)).resolves.toBe(output);
    expect(gateway.postInvestAmount).toHaveBeenCalledWith(input);
  });

  it('PostInvestIntentionUseCase proxies postInvestIntention', async () => {
    const output = { intentionId: 'int_1' };
    const gateway = {
      postInvestIntention: vi.fn().mockResolvedValue(output),
    } as unknown as ICoreGateway;
    const input = { customerId: 'cus_1', productId: 'prd_1' };

    await expect(new PostInvestIntentionUseCase(gateway).execute(input)).resolves.toBe(output);
    expect(gateway.postInvestIntention).toHaveBeenCalledWith(input);
  });
});
