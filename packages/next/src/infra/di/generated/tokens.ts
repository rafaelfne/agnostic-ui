// AUTO-GERADO por scripts/generate-di.mjs — não editar à mão (manual §2.5.3).
// Rode `pnpm --filter @yukilabs/agnostic-ui-next gen:di` após adicionar use case ou controller.

import type { InjectionToken } from 'tsyringe';
import type {
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
import type {
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

export const GET_BALANCE_USE_CASE_TOKEN: InjectionToken<GetBalanceUseCase> =
  Symbol('GetBalanceUseCase');
export const GET_CATALOG_CATEGORY_USE_CASE_TOKEN: InjectionToken<GetCatalogCategoryUseCase> =
  Symbol('GetCatalogCategoryUseCase');
export const GET_CATALOG_PORTFOLIOS_USE_CASE_TOKEN: InjectionToken<GetCatalogPortfoliosUseCase> =
  Symbol('GetCatalogPortfoliosUseCase');
export const GET_CATALOG_PRODUCT_DETAILS_USE_CASE_TOKEN: InjectionToken<GetCatalogProductDetailsUseCase> =
  Symbol('GetCatalogProductDetailsUseCase');
export const GET_CONSOLIDATED_CUSTODY_USE_CASE_TOKEN: InjectionToken<GetConsolidatedCustodyUseCase> =
  Symbol('GetConsolidatedCustodyUseCase');
export const GET_INVEST_FLOW_USE_CASE_TOKEN: InjectionToken<GetInvestFlowUseCase> =
  Symbol('GetInvestFlowUseCase');
export const GET_INVEST_REVIEW_USE_CASE_TOKEN: InjectionToken<GetInvestReviewUseCase> =
  Symbol('GetInvestReviewUseCase');
export const GET_INVESTMENTS_CATEGORY_USE_CASE_TOKEN: InjectionToken<GetInvestmentsCategoryUseCase> =
  Symbol('GetInvestmentsCategoryUseCase');
export const GET_INVESTMENTS_PRODUCTS_SUMMARY_USE_CASE_TOKEN: InjectionToken<GetInvestmentsProductsSummaryUseCase> =
  Symbol('GetInvestmentsProductsSummaryUseCase');
export const GET_INVESTMENTS_PRODUCTS_USE_CASE_TOKEN: InjectionToken<GetInvestmentsProductsUseCase> =
  Symbol('GetInvestmentsProductsUseCase');
export const GET_PORTFOLIO_BUILDER_PREVIEW_USE_CASE_TOKEN: InjectionToken<GetPortfolioBuilderPreviewUseCase> =
  Symbol('GetPortfolioBuilderPreviewUseCase');
export const GET_PORTFOLIO_BUILDER_RISK_SELECT_USE_CASE_TOKEN: InjectionToken<GetPortfolioBuilderRiskSelectUseCase> =
  Symbol('GetPortfolioBuilderRiskSelectUseCase');
export const GET_PORTFOLIO_HERO_USE_CASE_TOKEN: InjectionToken<GetPortfolioHeroUseCase> =
  Symbol('GetPortfolioHeroUseCase');
export const GET_USER_WALLETS_USE_CASE_TOKEN: InjectionToken<GetUserWalletsUseCase> =
  Symbol('GetUserWalletsUseCase');
export const POST_INVEST_AMOUNT_USE_CASE_TOKEN: InjectionToken<PostInvestAmountUseCase> =
  Symbol('PostInvestAmountUseCase');
export const POST_INVEST_INTENTION_USE_CASE_TOKEN: InjectionToken<PostInvestIntentionUseCase> =
  Symbol('PostInvestIntentionUseCase');
export const POST_PORTFOLIO_BUILDER_CREATE_PORTFOLIO_USE_CASE_TOKEN: InjectionToken<PostPortfolioBuilderCreatePortfolioUseCase> =
  Symbol('PostPortfolioBuilderCreatePortfolioUseCase');
export const BALANCE_CONTROLLER_TOKEN: InjectionToken<BalanceController> =
  Symbol('BalanceController');
export const GET_CATALOG_CATEGORY_CONTROLLER_TOKEN: InjectionToken<GetCatalogCategoryController> =
  Symbol('GetCatalogCategoryController');
export const GET_CATALOG_PORTFOLIOS_CONTROLLER_TOKEN: InjectionToken<GetCatalogPortfoliosController> =
  Symbol('GetCatalogPortfoliosController');
export const GET_CATALOG_PRODUCT_DETAILS_CONTROLLER_TOKEN: InjectionToken<GetCatalogProductDetailsController> =
  Symbol('GetCatalogProductDetailsController');
export const GET_CONSOLIDATED_CUSTODY_CONTROLLER_TOKEN: InjectionToken<GetConsolidatedCustodyController> =
  Symbol('GetConsolidatedCustodyController');
export const GET_INVEST_FLOW_CONTROLLER_TOKEN: InjectionToken<GetInvestFlowController> =
  Symbol('GetInvestFlowController');
export const GET_INVEST_REVIEW_CONTROLLER_TOKEN: InjectionToken<GetInvestReviewController> = Symbol(
  'GetInvestReviewController',
);
export const GET_INVESTMENTS_CATEGORY_CONTROLLER_TOKEN: InjectionToken<GetInvestmentsCategoryController> =
  Symbol('GetInvestmentsCategoryController');
export const GET_INVESTMENTS_PRODUCTS_CONTROLLER_TOKEN: InjectionToken<GetInvestmentsProductsController> =
  Symbol('GetInvestmentsProductsController');
export const GET_INVESTMENTS_PRODUCTS_SUMMARY_CONTROLLER_TOKEN: InjectionToken<GetInvestmentsProductsSummaryController> =
  Symbol('GetInvestmentsProductsSummaryController');
export const GET_PORTFOLIO_BUILDER_PREVIEW_CONTROLLER_TOKEN: InjectionToken<GetPortfolioBuilderPreviewController> =
  Symbol('GetPortfolioBuilderPreviewController');
export const GET_PORTFOLIO_BUILDER_RISK_SELECT_CONTROLLER_TOKEN: InjectionToken<GetPortfolioBuilderRiskSelectController> =
  Symbol('GetPortfolioBuilderRiskSelectController');
export const GET_PORTFOLIO_HERO_CONTROLLER_TOKEN: InjectionToken<GetPortfolioHeroController> =
  Symbol('GetPortfolioHeroController');
export const GET_USER_WALLETS_CONTROLLER_TOKEN: InjectionToken<GetUserWalletsController> = Symbol(
  'GetUserWalletsController',
);
export const POST_INVEST_AMOUNT_CONTROLLER_TOKEN: InjectionToken<PostInvestAmountController> =
  Symbol('PostInvestAmountController');
export const POST_INVEST_INTENTION_CONTROLLER_TOKEN: InjectionToken<PostInvestIntentionController> =
  Symbol('PostInvestIntentionController');
export const POST_PORTFOLIO_BUILDER_CREATE_PORTFOLIO_CONTROLLER_TOKEN: InjectionToken<PostPortfolioBuilderCreatePortfolioController> =
  Symbol('PostPortfolioBuilderCreatePortfolioController');
