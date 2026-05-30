import { describe, expect, it, vi } from 'vitest';
import type { ICoreGateway } from '../application/ports';
import { GetBalanceUseCase } from '../application/useCases';

describe('GetBalanceUseCase', () => {
  it('proxies getBalance to the core gateway', async () => {
    const output = { netWorth: 1 };
    const gateway = { getBalance: vi.fn().mockResolvedValue(output) } as unknown as ICoreGateway;
    const useCase = new GetBalanceUseCase(gateway);
    const input = { customerId: 'cus_1' };

    await expect(useCase.execute(input)).resolves.toBe(output);
    expect(gateway.getBalance).toHaveBeenCalledWith(input);
  });
});
