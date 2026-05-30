import type { GetUserWalletsOutput } from '../../../../application/ports';

export function getUserWalletsMock(): GetUserWalletsOutput {
  return {
    wallets: [{ id: 'wlt_main', label: 'Carteira Principal', balance: 1_250_000, currency: 'BRL' }],
  };
}

export function getUserWalletsMockEmpty(): GetUserWalletsOutput {
  return { wallets: [] };
}
