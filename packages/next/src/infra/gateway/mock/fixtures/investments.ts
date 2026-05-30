import type {
  GetInvestmentsCategoryOutput,
  GetInvestmentsProductsOutput,
  GetInvestmentsProductsSummaryOutput,
} from '../../../../application/ports';

export function getInvestmentsCategoryMock(): GetInvestmentsCategoryOutput {
  return {
    categories: [
      { id: 'cat_funds', name: 'Fundos', count: 12 },
      { id: 'cat_fixed_income', name: 'Renda Fixa', count: 8 },
    ],
  };
}

export function getInvestmentsProductsMock(): GetInvestmentsProductsOutput {
  return {
    products: [
      { id: 'prd_balanced', name: 'Fundo Balanceado', category: 'cat_funds', minAmount: 10_000 },
      { id: 'prd_cdb_plus', name: 'CDB Plus', category: 'cat_fixed_income', minAmount: 100_000 },
    ],
  };
}

export function getInvestmentsProductsSummaryMock(): GetInvestmentsProductsSummaryOutput {
  return {
    productId: 'prd_balanced',
    name: 'Fundo Balanceado',
    annualReturn: 0.124,
    riskLevel: 'moderate',
    minAmount: 10_000,
    currency: 'BRL',
  };
}
