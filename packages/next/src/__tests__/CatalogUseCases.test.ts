import { describe, expect, it, vi } from 'vitest';
import type { ICoreGateway } from '../application/ports';
import {
  GetCatalogCategoryUseCase,
  GetCatalogPortfoliosUseCase,
  GetCatalogProductDetailsUseCase,
} from '../application/useCases';

describe('catalog use cases', () => {
  it('GetCatalogCategoryUseCase proxies getCatalogCategory', async () => {
    const output = { categories: [] };
    const gateway = {
      getCatalogCategory: vi.fn().mockResolvedValue(output),
    } as unknown as ICoreGateway;
    const input = { customerId: 'cus_1' };

    await expect(new GetCatalogCategoryUseCase(gateway).execute(input)).resolves.toBe(output);
    expect(gateway.getCatalogCategory).toHaveBeenCalledWith(input);
  });

  it('GetCatalogProductDetailsUseCase proxies getCatalogProductDetails', async () => {
    const output = { id: 'prd_1' };
    const gateway = {
      getCatalogProductDetails: vi.fn().mockResolvedValue(output),
    } as unknown as ICoreGateway;
    const input = { customerId: 'cus_1', productId: 'prd_1' };

    await expect(new GetCatalogProductDetailsUseCase(gateway).execute(input)).resolves.toBe(output);
    expect(gateway.getCatalogProductDetails).toHaveBeenCalledWith(input);
  });

  it('GetCatalogPortfoliosUseCase proxies getCatalogPortfolios', async () => {
    const output = { portfolios: [] };
    const gateway = {
      getCatalogPortfolios: vi.fn().mockResolvedValue(output),
    } as unknown as ICoreGateway;
    const input = { customerId: 'cus_1' };

    await expect(new GetCatalogPortfoliosUseCase(gateway).execute(input)).resolves.toBe(output);
    expect(gateway.getCatalogPortfolios).toHaveBeenCalledWith(input);
  });
});
