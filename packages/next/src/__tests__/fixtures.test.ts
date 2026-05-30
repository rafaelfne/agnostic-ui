import { describe, it, expect } from 'vitest';
import {
  getBalanceMock,
  getBalanceMockEmpty,
  getCatalogPortfoliosMock,
  getCatalogPortfoliosMockEmpty,
  getConsolidatedCustodyMock,
  getConsolidatedCustodyMockEmpty,
  getUserWalletsMock,
  getUserWalletsMockEmpty,
} from '../infra/gateway/mock/fixtures';

describe('mock fixtures', () => {
  it('pins the manual empty-state shape for consolidated custody', () => {
    expect(getConsolidatedCustodyMockEmpty()).toEqual({
      isEmpty: true,
      totalValue: 0,
      managedPortfolios: [],
    });
  });

  it('returns empty collections for the four empty fixtures', () => {
    expect(getCatalogPortfoliosMockEmpty()).toEqual({ portfolios: [] });
    expect(getUserWalletsMockEmpty()).toEqual({ wallets: [] });
    expect(getConsolidatedCustodyMockEmpty().managedPortfolios).toEqual([]);
    expect(getBalanceMockEmpty()).toMatchObject({ netWorth: 0, available: 0, invested: 0 });
  });

  it('returns populated collections for the matching happyPath fixtures', () => {
    expect(getCatalogPortfoliosMock().portfolios).not.toHaveLength(0);
    expect(getUserWalletsMock().wallets).not.toHaveLength(0);
    expect(getConsolidatedCustodyMock()).toMatchObject({ isEmpty: false });
    expect(getBalanceMock().netWorth).toBeGreaterThan(0);
  });
});
