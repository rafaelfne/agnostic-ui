import type { GetConsolidatedCustodyOutput } from '../../../../application/ports';

export function getConsolidatedCustodyMock(): GetConsolidatedCustodyOutput {
  return {
    isEmpty: false,
    totalValue: 11_250_000,
    managedPortfolios: [{ id: 'pf_balanced', name: 'Balanceado', value: 11_250_000 }],
  };
}

// Shape exato do manual (Parte 2.4.2): empty-state canônico da custódia consolidada.
export function getConsolidatedCustodyMockEmpty(): GetConsolidatedCustodyOutput {
  return {
    isEmpty: true,
    totalValue: 0,
    managedPortfolios: [],
  };
}
