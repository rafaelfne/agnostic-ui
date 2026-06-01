import type {
  GetCatalogCategoryOutput,
  GetCatalogPortfoliosOutput,
  GetCatalogProductDetailsOutput,
} from '../../../../application/ports';

export function getCatalogCategoryMock(): GetCatalogCategoryOutput {
  return {
    categories: [
      { id: 'cat_funds', name: 'Fundos' },
      { id: 'cat_portfolios', name: 'Carteiras' },
    ],
  };
}

export function getCatalogProductDetailsMock(): GetCatalogProductDetailsOutput {
  return {
    id: 'prd_balanced',
    name: 'Fundo Balanceado',
    description: 'Carteira diversificada de risco moderado.',
    annualReturn: 0.124,
    riskLevel: 'moderate',
    minAmount: 10_000,
    currency: 'BRL',
  };
}

export function getCatalogPortfoliosMock(): GetCatalogPortfoliosOutput {
  return {
    portfolios: [
      { id: 'pf_conservative', name: 'Conservadora', riskLevel: 'low', expectedReturn: 0.085 },
      { id: 'pf_balanced', name: 'Balanceada', riskLevel: 'moderate', expectedReturn: 0.124 },
    ],
  };
}

export function getCatalogPortfoliosMockEmpty(): GetCatalogPortfoliosOutput {
  return { portfolios: [] };
}
