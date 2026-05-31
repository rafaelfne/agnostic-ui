// AUTO-GERADO por scripts/generate-di.mjs — não editar à mão (manual §2.5.3).
// Rode `pnpm --filter @yukilabs/agnostic-ui-next gen:di` após adicionar use case ou controller.

import type { DependencyContainer } from 'tsyringe';
import {
  GetBalanceUseCase,
  GetCatalogCategoryUseCase,
  GetCatalogPortfoliosUseCase,
  GetCatalogProductDetailsUseCase,
  GetConsolidatedCustodyUseCase,
  GetInvestFlowUseCase,
  GetInvestReviewUseCase,
  GetInvestmentsCategoryUseCase,
  GetInvestmentsProductsSummaryUseCase,
  GetInvestmentsProductsUseCase,
  GetPortfolioBuilderPreviewUseCase,
  GetPortfolioBuilderRiskSelectUseCase,
  GetPortfolioHeroUseCase,
  GetUserWalletsUseCase,
  PostInvestAmountUseCase,
  PostInvestIntentionUseCase,
  PostPortfolioBuilderCreatePortfolioUseCase,
} from '../../../application/useCases';
import {
  BalanceController,
  GetCatalogCategoryController,
  GetCatalogPortfoliosController,
  GetCatalogProductDetailsController,
  GetConsolidatedCustodyController,
  GetInvestFlowController,
  GetInvestReviewController,
  GetInvestmentsCategoryController,
  GetInvestmentsProductsController,
  GetInvestmentsProductsSummaryController,
  GetPortfolioBuilderPreviewController,
  GetPortfolioBuilderRiskSelectController,
  GetPortfolioHeroController,
  GetUserWalletsController,
  PostInvestAmountController,
  PostInvestIntentionController,
  PostPortfolioBuilderCreatePortfolioController,
} from '../../../interface/controllers';
import {
  GET_BALANCE_USE_CASE_TOKEN,
  GET_CATALOG_CATEGORY_USE_CASE_TOKEN,
  GET_CATALOG_PORTFOLIOS_USE_CASE_TOKEN,
  GET_CATALOG_PRODUCT_DETAILS_USE_CASE_TOKEN,
  GET_CONSOLIDATED_CUSTODY_USE_CASE_TOKEN,
  GET_INVEST_FLOW_USE_CASE_TOKEN,
  GET_INVEST_REVIEW_USE_CASE_TOKEN,
  GET_INVESTMENTS_CATEGORY_USE_CASE_TOKEN,
  GET_INVESTMENTS_PRODUCTS_SUMMARY_USE_CASE_TOKEN,
  GET_INVESTMENTS_PRODUCTS_USE_CASE_TOKEN,
  GET_PORTFOLIO_BUILDER_PREVIEW_USE_CASE_TOKEN,
  GET_PORTFOLIO_BUILDER_RISK_SELECT_USE_CASE_TOKEN,
  GET_PORTFOLIO_HERO_USE_CASE_TOKEN,
  GET_USER_WALLETS_USE_CASE_TOKEN,
  POST_INVEST_AMOUNT_USE_CASE_TOKEN,
  POST_INVEST_INTENTION_USE_CASE_TOKEN,
  POST_PORTFOLIO_BUILDER_CREATE_PORTFOLIO_USE_CASE_TOKEN,
  BALANCE_CONTROLLER_TOKEN,
  GET_CATALOG_CATEGORY_CONTROLLER_TOKEN,
  GET_CATALOG_PORTFOLIOS_CONTROLLER_TOKEN,
  GET_CATALOG_PRODUCT_DETAILS_CONTROLLER_TOKEN,
  GET_CONSOLIDATED_CUSTODY_CONTROLLER_TOKEN,
  GET_INVEST_FLOW_CONTROLLER_TOKEN,
  GET_INVEST_REVIEW_CONTROLLER_TOKEN,
  GET_INVESTMENTS_CATEGORY_CONTROLLER_TOKEN,
  GET_INVESTMENTS_PRODUCTS_CONTROLLER_TOKEN,
  GET_INVESTMENTS_PRODUCTS_SUMMARY_CONTROLLER_TOKEN,
  GET_PORTFOLIO_BUILDER_PREVIEW_CONTROLLER_TOKEN,
  GET_PORTFOLIO_BUILDER_RISK_SELECT_CONTROLLER_TOKEN,
  GET_PORTFOLIO_HERO_CONTROLLER_TOKEN,
  GET_USER_WALLETS_CONTROLLER_TOKEN,
  POST_INVEST_AMOUNT_CONTROLLER_TOKEN,
  POST_INVEST_INTENTION_CONTROLLER_TOKEN,
  POST_PORTFOLIO_BUILDER_CREATE_PORTFOLIO_CONTROLLER_TOKEN,
} from './tokens';

/**
 * Registra use cases e controllers no container raiz (manual §2.6.1). Transient:
 * cada `resolve` constrói uma instância nova, então as dependências request-scoped
 * (gateway, executionContext) resolvem do child container que iniciou o `resolve`.
 */
export function registerGeneratedServices(container: DependencyContainer): void {
  container.register(GET_BALANCE_USE_CASE_TOKEN, { useClass: GetBalanceUseCase });
  container.register(GET_CATALOG_CATEGORY_USE_CASE_TOKEN, { useClass: GetCatalogCategoryUseCase });
  container.register(GET_CATALOG_PORTFOLIOS_USE_CASE_TOKEN, {
    useClass: GetCatalogPortfoliosUseCase,
  });
  container.register(GET_CATALOG_PRODUCT_DETAILS_USE_CASE_TOKEN, {
    useClass: GetCatalogProductDetailsUseCase,
  });
  container.register(GET_CONSOLIDATED_CUSTODY_USE_CASE_TOKEN, {
    useClass: GetConsolidatedCustodyUseCase,
  });
  container.register(GET_INVEST_FLOW_USE_CASE_TOKEN, { useClass: GetInvestFlowUseCase });
  container.register(GET_INVEST_REVIEW_USE_CASE_TOKEN, { useClass: GetInvestReviewUseCase });
  container.register(GET_INVESTMENTS_CATEGORY_USE_CASE_TOKEN, {
    useClass: GetInvestmentsCategoryUseCase,
  });
  container.register(GET_INVESTMENTS_PRODUCTS_SUMMARY_USE_CASE_TOKEN, {
    useClass: GetInvestmentsProductsSummaryUseCase,
  });
  container.register(GET_INVESTMENTS_PRODUCTS_USE_CASE_TOKEN, {
    useClass: GetInvestmentsProductsUseCase,
  });
  container.register(GET_PORTFOLIO_BUILDER_PREVIEW_USE_CASE_TOKEN, {
    useClass: GetPortfolioBuilderPreviewUseCase,
  });
  container.register(GET_PORTFOLIO_BUILDER_RISK_SELECT_USE_CASE_TOKEN, {
    useClass: GetPortfolioBuilderRiskSelectUseCase,
  });
  container.register(GET_PORTFOLIO_HERO_USE_CASE_TOKEN, { useClass: GetPortfolioHeroUseCase });
  container.register(GET_USER_WALLETS_USE_CASE_TOKEN, { useClass: GetUserWalletsUseCase });
  container.register(POST_INVEST_AMOUNT_USE_CASE_TOKEN, { useClass: PostInvestAmountUseCase });
  container.register(POST_INVEST_INTENTION_USE_CASE_TOKEN, {
    useClass: PostInvestIntentionUseCase,
  });
  container.register(POST_PORTFOLIO_BUILDER_CREATE_PORTFOLIO_USE_CASE_TOKEN, {
    useClass: PostPortfolioBuilderCreatePortfolioUseCase,
  });
  container.register(BALANCE_CONTROLLER_TOKEN, { useClass: BalanceController });
  container.register(GET_CATALOG_CATEGORY_CONTROLLER_TOKEN, {
    useClass: GetCatalogCategoryController,
  });
  container.register(GET_CATALOG_PORTFOLIOS_CONTROLLER_TOKEN, {
    useClass: GetCatalogPortfoliosController,
  });
  container.register(GET_CATALOG_PRODUCT_DETAILS_CONTROLLER_TOKEN, {
    useClass: GetCatalogProductDetailsController,
  });
  container.register(GET_CONSOLIDATED_CUSTODY_CONTROLLER_TOKEN, {
    useClass: GetConsolidatedCustodyController,
  });
  container.register(GET_INVEST_FLOW_CONTROLLER_TOKEN, { useClass: GetInvestFlowController });
  container.register(GET_INVEST_REVIEW_CONTROLLER_TOKEN, { useClass: GetInvestReviewController });
  container.register(GET_INVESTMENTS_CATEGORY_CONTROLLER_TOKEN, {
    useClass: GetInvestmentsCategoryController,
  });
  container.register(GET_INVESTMENTS_PRODUCTS_CONTROLLER_TOKEN, {
    useClass: GetInvestmentsProductsController,
  });
  container.register(GET_INVESTMENTS_PRODUCTS_SUMMARY_CONTROLLER_TOKEN, {
    useClass: GetInvestmentsProductsSummaryController,
  });
  container.register(GET_PORTFOLIO_BUILDER_PREVIEW_CONTROLLER_TOKEN, {
    useClass: GetPortfolioBuilderPreviewController,
  });
  container.register(GET_PORTFOLIO_BUILDER_RISK_SELECT_CONTROLLER_TOKEN, {
    useClass: GetPortfolioBuilderRiskSelectController,
  });
  container.register(GET_PORTFOLIO_HERO_CONTROLLER_TOKEN, { useClass: GetPortfolioHeroController });
  container.register(GET_USER_WALLETS_CONTROLLER_TOKEN, { useClass: GetUserWalletsController });
  container.register(POST_INVEST_AMOUNT_CONTROLLER_TOKEN, { useClass: PostInvestAmountController });
  container.register(POST_INVEST_INTENTION_CONTROLLER_TOKEN, {
    useClass: PostInvestIntentionController,
  });
  container.register(POST_PORTFOLIO_BUILDER_CREATE_PORTFOLIO_CONTROLLER_TOKEN, {
    useClass: PostPortfolioBuilderCreatePortfolioController,
  });
}
