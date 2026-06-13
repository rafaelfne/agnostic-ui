import type { FlowDefinitionInput } from '@yukilabs/agnostic-ui-engine';

/**
 * A `customerId`-only GET use case as config (Fase C, ADR 0002 §8): validate the
 * customer (from the execution context, never the client), call the core
 * operation, and return its result. The financial vertical's GET data endpoints
 * all share this shape, so they are generated from one factory.
 */
export function customerDataFlow(id: string, name: string, operation: string): FlowDefinitionInput {
  return {
    id,
    name,
    input: { from: 'executionContext', pick: ['customerId'] },
    steps: [
      { op: 'validate', require: ['customerId'] },
      { op: 'call-integration', integration: 'core', operation, as: 'result' },
    ],
    output: '{{ result }}',
  };
}

/** The GET data flows (Group A) migrated to config; `get-balance` is defined separately. */
export const customerDataFlows: readonly FlowDefinitionInput[] = [
  customerDataFlow('catalog-category', 'Catalog Category', 'getCatalogCategory'),
  customerDataFlow('catalog-portfolios', 'Catalog Portfolios', 'getCatalogPortfolios'),
  customerDataFlow('consolidated-custody', 'Consolidated Custody', 'getConsolidatedCustody'),
  customerDataFlow('invest-flow', 'Invest Flow', 'getInvestFlow'),
  customerDataFlow('invest-review', 'Invest Review', 'getInvestReview'),
  customerDataFlow('investments-category', 'Investments Category', 'getInvestmentsCategory'),
  customerDataFlow('investments-products', 'Investments Products', 'getInvestmentsProducts'),
  customerDataFlow(
    'investments-products-summary',
    'Investments Products Summary',
    'getInvestmentsProductsSummary',
  ),
  customerDataFlow(
    'portfolio-builder-risk-select',
    'Portfolio Builder Risk Select',
    'getPortfolioBuilderRiskSelect',
  ),
  customerDataFlow('portfolio-hero', 'Portfolio Hero', 'getPortfolioHero'),
  customerDataFlow('user-wallets', 'User Wallets', 'getUserWallets'),
];
