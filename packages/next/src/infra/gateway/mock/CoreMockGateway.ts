import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';
import type { ExecutionContext, MockProfile } from '@yukilabs/agnostic-ui-core';
import type {
  ICoreGateway,
  GetBalanceOutput,
  GetInvestFlowOutput,
  GetInvestReviewOutput,
  PostInvestAmountOutput,
  PostInvestIntentionOutput,
  GetInvestmentsCategoryOutput,
  GetInvestmentsProductsOutput,
  GetInvestmentsProductsSummaryOutput,
  GetCatalogCategoryOutput,
  GetCatalogProductDetailsOutput,
  GetCatalogPortfoliosOutput,
  GetPortfolioBuilderRiskSelectOutput,
  GetPortfolioBuilderPreviewOutput,
  PostPortfolioBuilderCreatePortfolioOutput,
  GetPortfolioHeroOutput,
  GetConsolidatedCustodyOutput,
  GetUserWalletsOutput,
} from '../../../application/ports';
import { EXECUTION_CONTEXT_TOKEN } from '../../di/tokens';
import { withProfile } from './withProfile';
import * as fixtures from './fixtures';

/**
 * Sandbox / mock implementation of `ICoreGateway` (manual, Parte 2.4.2). Each
 * operation reconciles its fixtures against the active `MockProfile` via
 * `withProfile`. In `live` mode bound to a mock dataSource the context carries
 * no `mockProfile`, so the profile resolves to `undefined` → happyPath.
 */
@injectable()
export class CoreMockGateway implements ICoreGateway {
  constructor(
    @inject(EXECUTION_CONTEXT_TOKEN) private readonly executionContext: ExecutionContext,
  ) {}

  private get profile(): MockProfile | undefined {
    return this.executionContext.mode === 'sandbox' ? this.executionContext.mockProfile : undefined;
  }

  getBalance(): Promise<GetBalanceOutput> {
    return withProfile(this.profile, {
      operation: 'getBalance',
      happyPath: fixtures.getBalanceMock,
      empty: fixtures.getBalanceMockEmpty,
    });
  }

  getInvestFlow(): Promise<GetInvestFlowOutput> {
    return withProfile(this.profile, {
      operation: 'getInvestFlow',
      happyPath: fixtures.getInvestFlowMock,
    });
  }

  getInvestReview(): Promise<GetInvestReviewOutput> {
    return withProfile(this.profile, {
      operation: 'getInvestReview',
      happyPath: fixtures.getInvestReviewMock,
    });
  }

  postInvestAmount(): Promise<PostInvestAmountOutput> {
    return withProfile(this.profile, {
      operation: 'postInvestAmount',
      happyPath: fixtures.postInvestAmountMock,
    });
  }

  postInvestIntention(): Promise<PostInvestIntentionOutput> {
    return withProfile(this.profile, {
      operation: 'postInvestIntention',
      happyPath: fixtures.postInvestIntentionMock,
    });
  }

  getInvestmentsCategory(): Promise<GetInvestmentsCategoryOutput> {
    return withProfile(this.profile, {
      operation: 'getInvestmentsCategory',
      happyPath: fixtures.getInvestmentsCategoryMock,
    });
  }

  getInvestmentsProducts(): Promise<GetInvestmentsProductsOutput> {
    return withProfile(this.profile, {
      operation: 'getInvestmentsProducts',
      happyPath: fixtures.getInvestmentsProductsMock,
    });
  }

  getInvestmentsProductsSummary(): Promise<GetInvestmentsProductsSummaryOutput> {
    return withProfile(this.profile, {
      operation: 'getInvestmentsProductsSummary',
      happyPath: fixtures.getInvestmentsProductsSummaryMock,
    });
  }

  getCatalogCategory(): Promise<GetCatalogCategoryOutput> {
    return withProfile(this.profile, {
      operation: 'getCatalogCategory',
      happyPath: fixtures.getCatalogCategoryMock,
    });
  }

  getCatalogProductDetails(): Promise<GetCatalogProductDetailsOutput> {
    return withProfile(this.profile, {
      operation: 'getCatalogProductDetails',
      happyPath: fixtures.getCatalogProductDetailsMock,
    });
  }

  getCatalogPortfolios(): Promise<GetCatalogPortfoliosOutput> {
    return withProfile(this.profile, {
      operation: 'getCatalogPortfolios',
      happyPath: fixtures.getCatalogPortfoliosMock,
      empty: fixtures.getCatalogPortfoliosMockEmpty,
    });
  }

  getPortfolioBuilderRiskSelect(): Promise<GetPortfolioBuilderRiskSelectOutput> {
    return withProfile(this.profile, {
      operation: 'getPortfolioBuilderRiskSelect',
      happyPath: fixtures.getPortfolioBuilderRiskSelectMock,
    });
  }

  getPortfolioBuilderPreview(): Promise<GetPortfolioBuilderPreviewOutput> {
    return withProfile(this.profile, {
      operation: 'getPortfolioBuilderPreview',
      happyPath: fixtures.getPortfolioBuilderPreviewMock,
    });
  }

  postPortfolioBuilderCreatePortfolio(): Promise<PostPortfolioBuilderCreatePortfolioOutput> {
    return withProfile(this.profile, {
      operation: 'postPortfolioBuilderCreatePortfolio',
      happyPath: fixtures.postPortfolioBuilderCreatePortfolioMock,
    });
  }

  getPortfolioHero(): Promise<GetPortfolioHeroOutput> {
    return withProfile(this.profile, {
      operation: 'getPortfolioHero',
      happyPath: fixtures.getPortfolioHeroMock,
    });
  }

  getConsolidatedCustody(): Promise<GetConsolidatedCustodyOutput> {
    return withProfile(this.profile, {
      operation: 'getConsolidatedCustody',
      happyPath: fixtures.getConsolidatedCustodyMock,
      empty: fixtures.getConsolidatedCustodyMockEmpty,
    });
  }

  getUserWallets(): Promise<GetUserWalletsOutput> {
    return withProfile(this.profile, {
      operation: 'getUserWallets',
      happyPath: fixtures.getUserWalletsMock,
      empty: fixtures.getUserWalletsMockEmpty,
    });
  }
}
