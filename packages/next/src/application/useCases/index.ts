/**
 * Use cases (manual, Parte 2.3.2): one injectable class per business operation,
 * each a thin proxy over `ICoreGateway`. Grows one slice per F3 sub-issue.
 */
export * from './GetBalanceUseCase';
export * from './GetInvestFlowUseCase';
export * from './GetInvestReviewUseCase';
export * from './PostInvestAmountUseCase';
export * from './PostInvestIntentionUseCase';
