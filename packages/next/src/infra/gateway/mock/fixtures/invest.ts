import type {
  GetInvestFlowOutput,
  GetInvestReviewOutput,
  PostInvestAmountOutput,
  PostInvestIntentionOutput,
} from '../../../../application/ports';

export function getInvestFlowMock(): GetInvestFlowOutput {
  return {
    flowId: 'flow_invest_default',
    currency: 'BRL',
    minAmount: 10_000,
    maxAmount: 100_000_000,
    suggestedAmounts: [50_000, 100_000, 250_000],
  };
}

export function getInvestReviewMock(): GetInvestReviewOutput {
  return {
    amount: 100_000,
    currency: 'BRL',
    estimatedShares: 12.3456,
    fees: { entry: 0, management: 50 },
    product: { id: 'prd_balanced', name: 'Fundo Balanceado' },
  };
}

export function postInvestAmountMock(): PostInvestAmountOutput {
  return {
    orderId: 'ord_invest_0001',
    status: 'accepted',
    amount: 100_000,
    currency: 'BRL',
  };
}

export function postInvestIntentionMock(): PostInvestIntentionOutput {
  return {
    intentionId: 'int_invest_0001',
    status: 'registered',
  };
}
