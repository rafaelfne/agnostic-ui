/**
 * Per-operation mock fixtures (manual, Parte 2.4.2). Each `<operation>Mock`
 * returns a plausible happyPath payload; the four collection operations
 * (`getBalance`, `getCatalogPortfolios`, `getConsolidatedCustody`,
 * `getUserWallets`) also expose a `<operation>MockEmpty` for the `empty`
 * profile. Monetary amounts are integer minor units (cents); DTOs stay
 * `Record<string, unknown>` placeholders until the live gateway lands (F3).
 */
export * from './balance';
export * from './invest';
export * from './investments';
export * from './catalog';
export * from './portfolioBuilder';
export * from './portfolio';
export * from './custody';
export * from './wallets';
