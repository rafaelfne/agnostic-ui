/**
 * Port: contract with the external business API — the ~17 operations that mirror
 * the Core HTTP surface (manual, Parte 2.3.1 / 2.3.2). Implementations live in
 * infra (F2): CoreHttpGateway (live) and CoreMockGateway (sandbox / mock).
 *
 * Each operation follows the manual's `getFoo(input: GetFooInput): Promise<GetFooOutput>`
 * convention. Field-level DTO shapes land with the fixtures and the live gateway
 * (F2/F3); until then each DTO is a distinct named placeholder, so the contract
 * surface is explicit and concrete shapes can be filled without touching call sites.
 */

/** Placeholder for an operation request payload (query params / body). Shape: F2/F3. */
export type CoreRequestPayload = Record<string, unknown>;
/** Placeholder for an operation response payload. Shape: F2/F3. */
export type CoreResponsePayload = Record<string, unknown>;

export type GetBalanceInput = CoreRequestPayload;
export type GetBalanceOutput = CoreResponsePayload;

export type GetInvestFlowInput = CoreRequestPayload;
export type GetInvestFlowOutput = CoreResponsePayload;

export type GetInvestReviewInput = CoreRequestPayload;
export type GetInvestReviewOutput = CoreResponsePayload;

export type PostInvestAmountInput = CoreRequestPayload;
export type PostInvestAmountOutput = CoreResponsePayload;

export type PostInvestIntentionInput = CoreRequestPayload;
export type PostInvestIntentionOutput = CoreResponsePayload;

export type GetInvestmentsCategoryInput = CoreRequestPayload;
export type GetInvestmentsCategoryOutput = CoreResponsePayload;

export type GetInvestmentsProductsInput = CoreRequestPayload;
export type GetInvestmentsProductsOutput = CoreResponsePayload;

export type GetInvestmentsProductsSummaryInput = CoreRequestPayload;
export type GetInvestmentsProductsSummaryOutput = CoreResponsePayload;

export type GetCatalogCategoryInput = CoreRequestPayload;
export type GetCatalogCategoryOutput = CoreResponsePayload;

export type GetCatalogProductDetailsInput = CoreRequestPayload;
export type GetCatalogProductDetailsOutput = CoreResponsePayload;

export type GetCatalogPortfoliosInput = CoreRequestPayload;
export type GetCatalogPortfoliosOutput = CoreResponsePayload;

export type GetPortfolioBuilderRiskSelectInput = CoreRequestPayload;
export type GetPortfolioBuilderRiskSelectOutput = CoreResponsePayload;

export type GetPortfolioBuilderPreviewInput = CoreRequestPayload;
export type GetPortfolioBuilderPreviewOutput = CoreResponsePayload;

export type PostPortfolioBuilderCreatePortfolioInput = CoreRequestPayload;
export type PostPortfolioBuilderCreatePortfolioOutput = CoreResponsePayload;

export type GetPortfolioHeroInput = CoreRequestPayload;
export type GetPortfolioHeroOutput = CoreResponsePayload;

export type GetConsolidatedCustodyInput = CoreRequestPayload;
export type GetConsolidatedCustodyOutput = CoreResponsePayload;

export type GetUserWalletsInput = CoreRequestPayload;
export type GetUserWalletsOutput = CoreResponsePayload;

export interface ICoreGateway {
  getBalance(input: GetBalanceInput): Promise<GetBalanceOutput>;
  getInvestFlow(input: GetInvestFlowInput): Promise<GetInvestFlowOutput>;
  getInvestReview(input: GetInvestReviewInput): Promise<GetInvestReviewOutput>;
  postInvestAmount(input: PostInvestAmountInput): Promise<PostInvestAmountOutput>;
  postInvestIntention(input: PostInvestIntentionInput): Promise<PostInvestIntentionOutput>;
  getInvestmentsCategory(input: GetInvestmentsCategoryInput): Promise<GetInvestmentsCategoryOutput>;
  getInvestmentsProducts(input: GetInvestmentsProductsInput): Promise<GetInvestmentsProductsOutput>;
  getInvestmentsProductsSummary(
    input: GetInvestmentsProductsSummaryInput,
  ): Promise<GetInvestmentsProductsSummaryOutput>;
  getCatalogCategory(input: GetCatalogCategoryInput): Promise<GetCatalogCategoryOutput>;
  getCatalogProductDetails(
    input: GetCatalogProductDetailsInput,
  ): Promise<GetCatalogProductDetailsOutput>;
  getCatalogPortfolios(input: GetCatalogPortfoliosInput): Promise<GetCatalogPortfoliosOutput>;
  getPortfolioBuilderRiskSelect(
    input: GetPortfolioBuilderRiskSelectInput,
  ): Promise<GetPortfolioBuilderRiskSelectOutput>;
  getPortfolioBuilderPreview(
    input: GetPortfolioBuilderPreviewInput,
  ): Promise<GetPortfolioBuilderPreviewOutput>;
  postPortfolioBuilderCreatePortfolio(
    input: PostPortfolioBuilderCreatePortfolioInput,
  ): Promise<PostPortfolioBuilderCreatePortfolioOutput>;
  getPortfolioHero(input: GetPortfolioHeroInput): Promise<GetPortfolioHeroOutput>;
  getConsolidatedCustody(input: GetConsolidatedCustodyInput): Promise<GetConsolidatedCustodyOutput>;
  getUserWallets(input: GetUserWalletsInput): Promise<GetUserWalletsOutput>;
}
