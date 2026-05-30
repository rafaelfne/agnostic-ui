import type { GetPortfolioHeroOutput } from '../../../../application/ports';

export function getPortfolioHeroMock(): GetPortfolioHeroOutput {
  return {
    portfolioId: 'pf_balanced',
    name: 'Balanceada',
    totalValue: 11_250_000,
    currency: 'BRL',
    profitability: { value: 0.124, period: '12m' },
  };
}
