import { describe, expect, it, vi } from 'vitest';
import type { ICoreGateway } from '../application/ports';
import {
  GetInvestmentsCategoryUseCase,
  GetInvestmentsProductsSummaryUseCase,
  GetInvestmentsProductsUseCase,
} from '../application/useCases';

describe('investments use cases', () => {
  it('GetInvestmentsCategoryUseCase proxies getInvestmentsCategory', async () => {
    const output = { categories: [] };
    const gateway = {
      getInvestmentsCategory: vi.fn().mockResolvedValue(output),
    } as unknown as ICoreGateway;
    const input = { customerId: 'cus_1' };

    await expect(new GetInvestmentsCategoryUseCase(gateway).execute(input)).resolves.toBe(output);
    expect(gateway.getInvestmentsCategory).toHaveBeenCalledWith(input);
  });

  it('GetInvestmentsProductsUseCase proxies getInvestmentsProducts', async () => {
    const output = { products: [] };
    const gateway = {
      getInvestmentsProducts: vi.fn().mockResolvedValue(output),
    } as unknown as ICoreGateway;
    const input = { customerId: 'cus_1' };

    await expect(new GetInvestmentsProductsUseCase(gateway).execute(input)).resolves.toBe(output);
    expect(gateway.getInvestmentsProducts).toHaveBeenCalledWith(input);
  });

  it('GetInvestmentsProductsSummaryUseCase proxies getInvestmentsProductsSummary', async () => {
    const output = { productId: 'prd_1' };
    const gateway = {
      getInvestmentsProductsSummary: vi.fn().mockResolvedValue(output),
    } as unknown as ICoreGateway;
    const input = { customerId: 'cus_1' };

    await expect(new GetInvestmentsProductsSummaryUseCase(gateway).execute(input)).resolves.toBe(
      output,
    );
    expect(gateway.getInvestmentsProductsSummary).toHaveBeenCalledWith(input);
  });
});
