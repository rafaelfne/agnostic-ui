import type { FlowDefinitionInput } from '@yukilabs/agnostic-ui-engine';

/**
 * A `customerId`-only GET use case as config (Fase C, ADR 0002 §8): validate the
 * customer (from the execution context, never the client), call the core
 * operation, and return its result. The `trigger` carries the original public path
 * so the catch-all route can resolve the flow. Generated from one factory.
 */
export function customerDataFlow(
  id: string,
  name: string,
  operation: string,
  path: string,
): FlowDefinitionInput {
  return {
    id,
    name,
    trigger: { kind: 'http', method: 'GET', path },
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
  customerDataFlow(
    'catalog-category',
    'Catalog Category',
    'getCatalogCategory',
    '/api/catalog/category',
  ),
  customerDataFlow(
    'catalog-portfolios',
    'Catalog Portfolios',
    'getCatalogPortfolios',
    '/api/catalog/portfolios',
  ),
  customerDataFlow(
    'consolidated-custody',
    'Consolidated Custody',
    'getConsolidatedCustody',
    '/api/consolidated-custody',
  ),
  customerDataFlow('invest-flow', 'Invest Flow', 'getInvestFlow', '/api/invest/flow'),
  customerDataFlow('invest-review', 'Invest Review', 'getInvestReview', '/api/invest/review'),
  customerDataFlow(
    'investments-category',
    'Investments Category',
    'getInvestmentsCategory',
    '/api/investments/category',
  ),
  customerDataFlow(
    'investments-products',
    'Investments Products',
    'getInvestmentsProducts',
    '/api/investments/products',
  ),
  customerDataFlow(
    'investments-products-summary',
    'Investments Products Summary',
    'getInvestmentsProductsSummary',
    '/api/investments/products-summary',
  ),
  customerDataFlow(
    'portfolio-builder-risk-select',
    'Portfolio Builder Risk Select',
    'getPortfolioBuilderRiskSelect',
    '/api/portfolio-builder/risk-select',
  ),
  customerDataFlow(
    'portfolio-hero',
    'Portfolio Hero',
    'getPortfolioHero',
    '/api/portfolio-details/hero',
  ),
  customerDataFlow('user-wallets', 'User Wallets', 'getUserWallets', '/api/wallets'),
];
