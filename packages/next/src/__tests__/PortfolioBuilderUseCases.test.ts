import { describe, expect, it, vi } from 'vitest';
import type { ICoreGateway } from '../application/ports';
import {
  GetPortfolioBuilderPreviewUseCase,
  GetPortfolioBuilderRiskSelectUseCase,
  PostPortfolioBuilderCreatePortfolioUseCase,
} from '../application/useCases';

describe('portfolio-builder use cases', () => {
  it('GetPortfolioBuilderRiskSelectUseCase proxies getPortfolioBuilderRiskSelect', async () => {
    const output = { riskLevels: [] };
    const gateway = {
      getPortfolioBuilderRiskSelect: vi.fn().mockResolvedValue(output),
    } as unknown as ICoreGateway;
    const input = { customerId: 'cus_1' };

    await expect(new GetPortfolioBuilderRiskSelectUseCase(gateway).execute(input)).resolves.toBe(
      output,
    );
    expect(gateway.getPortfolioBuilderRiskSelect).toHaveBeenCalledWith(input);
  });

  it('GetPortfolioBuilderPreviewUseCase proxies getPortfolioBuilderPreview', async () => {
    const output = { riskLevel: 'moderate' };
    const gateway = {
      getPortfolioBuilderPreview: vi.fn().mockResolvedValue(output),
    } as unknown as ICoreGateway;
    const input = { customerId: 'cus_1', riskLevel: 'moderate' };

    await expect(new GetPortfolioBuilderPreviewUseCase(gateway).execute(input)).resolves.toBe(
      output,
    );
    expect(gateway.getPortfolioBuilderPreview).toHaveBeenCalledWith(input);
  });

  it('PostPortfolioBuilderCreatePortfolioUseCase proxies postPortfolioBuilderCreatePortfolio', async () => {
    const output = { portfolioId: 'pf_1' };
    const gateway = {
      postPortfolioBuilderCreatePortfolio: vi.fn().mockResolvedValue(output),
    } as unknown as ICoreGateway;
    const input = { customerId: 'cus_1', riskLevel: 'moderate' };

    await expect(
      new PostPortfolioBuilderCreatePortfolioUseCase(gateway).execute(input),
    ).resolves.toBe(output);
    expect(gateway.postPortfolioBuilderCreatePortfolio).toHaveBeenCalledWith(input);
  });
});
