import type { FlowDefinitionInput } from '@yukilabs/agnostic-ui-engine';

/**
 * A use case whose client input (query/body) is validated against a referenced
 * schema (Fase C onda 2). `customerId` always comes from the request input the host
 * built from the execution context (never the client); the remaining fields come
 * from the query string or JSON body. The schema is resolved by the host.
 */
function requestFlow(
  id: string,
  name: string,
  operation: string,
  schema: string,
  fields: readonly string[],
): FlowDefinitionInput {
  return {
    id,
    name,
    input: { from: 'request', pick: ['customerId', ...fields] },
    steps: [
      { op: 'validate', require: [], schema },
      { op: 'call-integration', integration: 'core', operation, as: 'result' },
    ],
    output: '{{ result }}',
  };
}

/** The query/body GET+POST flows (Groups B and C) migrated to config. */
export const queryBodyFlows: readonly FlowDefinitionInput[] = [
  requestFlow(
    'catalog-product-details',
    'Catalog Product Details',
    'getCatalogProductDetails',
    'GetCatalogProductDetails',
    ['productId'],
  ),
  requestFlow(
    'portfolio-builder-preview',
    'Portfolio Builder Preview',
    'getPortfolioBuilderPreview',
    'GetPortfolioBuilderPreview',
    ['riskLevel'],
  ),
  requestFlow('invest-amount', 'Invest Amount', 'postInvestAmount', 'PostInvestAmount', [
    'productId',
    'amount',
  ]),
  requestFlow(
    'invest-intention',
    'Invest Intention',
    'postInvestIntention',
    'PostInvestIntention',
    ['productId'],
  ),
  requestFlow(
    'portfolio-builder-create',
    'Portfolio Builder Create',
    'postPortfolioBuilderCreatePortfolio',
    'PostPortfolioBuilderCreatePortfolio',
    ['riskLevel'],
  ),
];
