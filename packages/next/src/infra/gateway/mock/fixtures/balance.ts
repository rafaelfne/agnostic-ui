import type { GetBalanceOutput } from '../../../../application/ports';

export function getBalanceMock(): GetBalanceOutput {
  return {
    netWorth: 12_500_000,
    available: 1_250_000,
    invested: 11_250_000,
    currency: 'BRL',
  };
}

export function getBalanceMockEmpty(): GetBalanceOutput {
  return {
    netWorth: 0,
    available: 0,
    invested: 0,
    currency: 'BRL',
  };
}
