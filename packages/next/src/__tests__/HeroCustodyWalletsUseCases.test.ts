import { describe, expect, it, vi } from 'vitest';
import type { ICoreGateway } from '../application/ports';
import {
  GetConsolidatedCustodyUseCase,
  GetPortfolioHeroUseCase,
  GetUserWalletsUseCase,
} from '../application/useCases';

describe('hero / custody / wallets use cases', () => {
  it('GetPortfolioHeroUseCase proxies getPortfolioHero', async () => {
    const output = { portfolioId: 'pf_1' };
    const gateway = {
      getPortfolioHero: vi.fn().mockResolvedValue(output),
    } as unknown as ICoreGateway;
    const input = { customerId: 'cus_1' };

    await expect(new GetPortfolioHeroUseCase(gateway).execute(input)).resolves.toBe(output);
    expect(gateway.getPortfolioHero).toHaveBeenCalledWith(input);
  });

  it('GetConsolidatedCustodyUseCase proxies getConsolidatedCustody', async () => {
    const output = { isEmpty: false };
    const gateway = {
      getConsolidatedCustody: vi.fn().mockResolvedValue(output),
    } as unknown as ICoreGateway;
    const input = { customerId: 'cus_1' };

    await expect(new GetConsolidatedCustodyUseCase(gateway).execute(input)).resolves.toBe(output);
    expect(gateway.getConsolidatedCustody).toHaveBeenCalledWith(input);
  });

  it('GetUserWalletsUseCase proxies getUserWallets', async () => {
    const output = { wallets: [] };
    const gateway = {
      getUserWallets: vi.fn().mockResolvedValue(output),
    } as unknown as ICoreGateway;
    const input = { customerId: 'cus_1' };

    await expect(new GetUserWalletsUseCase(gateway).execute(input)).resolves.toBe(output);
    expect(gateway.getUserWallets).toHaveBeenCalledWith(input);
  });
});
