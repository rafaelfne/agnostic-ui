import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';
import type {
  ICoreGateway,
  CoreRequestPayload,
  GetBalanceOutput,
  GetInvestFlowOutput,
  GetInvestReviewOutput,
  PostInvestAmountInput,
  PostInvestAmountOutput,
  PostInvestIntentionInput,
  PostInvestIntentionOutput,
  GetInvestmentsCategoryOutput,
  GetInvestmentsProductsOutput,
  GetInvestmentsProductsSummaryOutput,
  GetCatalogCategoryOutput,
  GetCatalogProductDetailsOutput,
  GetCatalogPortfoliosOutput,
  GetPortfolioBuilderRiskSelectOutput,
  GetPortfolioBuilderPreviewOutput,
  PostPortfolioBuilderCreatePortfolioInput,
  PostPortfolioBuilderCreatePortfolioOutput,
  GetPortfolioHeroOutput,
  GetConsolidatedCustodyOutput,
  GetUserWalletsOutput,
} from '../../../application/ports';
import { ACCESS_TOKEN_TOKEN } from '../../di/tokens';

/**
 * Live implementation of `ICoreGateway` — a thin HTTP skeleton (manual, Parte
 * 2.3). Reads the Core base URL from `CORE_API_BASE_URL`, forwards the request
 * access token as a Bearer credential, speaks JSON and surfaces any non-2xx as
 * an error. The per-operation paths and DTO shapes are placeholders; the real
 * Core contract (query params, response types, structured errors) lands in F3.
 */
@injectable()
export class CoreHttpGateway implements ICoreGateway {
  constructor(@inject(ACCESS_TOKEN_TOKEN) private readonly accessToken: string) {}

  private get baseUrl(): string {
    return process.env.CORE_API_BASE_URL ?? '';
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: CoreRequestPayload,
  ): Promise<T> {
    const headers: Record<string, string> = {
      authorization: `Bearer ${this.accessToken}`,
      accept: 'application/json',
    };
    if (body !== undefined) {
      headers['content-type'] = 'application/json';
    }
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`core http ${response.status} on ${method} ${path}`);
    }
    return (await response.json()) as T;
  }

  getBalance(): Promise<GetBalanceOutput> {
    return this.request<GetBalanceOutput>('GET', '/balance');
  }

  getInvestFlow(): Promise<GetInvestFlowOutput> {
    return this.request<GetInvestFlowOutput>('GET', '/invest/flow');
  }

  getInvestReview(): Promise<GetInvestReviewOutput> {
    return this.request<GetInvestReviewOutput>('GET', '/invest/review');
  }

  postInvestAmount(input: PostInvestAmountInput): Promise<PostInvestAmountOutput> {
    return this.request<PostInvestAmountOutput>('POST', '/invest/amount', input);
  }

  postInvestIntention(input: PostInvestIntentionInput): Promise<PostInvestIntentionOutput> {
    return this.request<PostInvestIntentionOutput>('POST', '/invest/intention', input);
  }

  getInvestmentsCategory(): Promise<GetInvestmentsCategoryOutput> {
    return this.request<GetInvestmentsCategoryOutput>('GET', '/investments/category');
  }

  getInvestmentsProducts(): Promise<GetInvestmentsProductsOutput> {
    return this.request<GetInvestmentsProductsOutput>('GET', '/investments/products');
  }

  getInvestmentsProductsSummary(): Promise<GetInvestmentsProductsSummaryOutput> {
    return this.request<GetInvestmentsProductsSummaryOutput>(
      'GET',
      '/investments/products/summary',
    );
  }

  getCatalogCategory(): Promise<GetCatalogCategoryOutput> {
    return this.request<GetCatalogCategoryOutput>('GET', '/catalog/category');
  }

  getCatalogProductDetails(): Promise<GetCatalogProductDetailsOutput> {
    return this.request<GetCatalogProductDetailsOutput>('GET', '/catalog/product-details');
  }

  getCatalogPortfolios(): Promise<GetCatalogPortfoliosOutput> {
    return this.request<GetCatalogPortfoliosOutput>('GET', '/catalog/portfolios');
  }

  getPortfolioBuilderRiskSelect(): Promise<GetPortfolioBuilderRiskSelectOutput> {
    return this.request<GetPortfolioBuilderRiskSelectOutput>(
      'GET',
      '/portfolio-builder/risk-select',
    );
  }

  getPortfolioBuilderPreview(): Promise<GetPortfolioBuilderPreviewOutput> {
    return this.request<GetPortfolioBuilderPreviewOutput>('GET', '/portfolio-builder/preview');
  }

  postPortfolioBuilderCreatePortfolio(
    input: PostPortfolioBuilderCreatePortfolioInput,
  ): Promise<PostPortfolioBuilderCreatePortfolioOutput> {
    return this.request<PostPortfolioBuilderCreatePortfolioOutput>(
      'POST',
      '/portfolio-builder/create-portfolio',
      input,
    );
  }

  getPortfolioHero(): Promise<GetPortfolioHeroOutput> {
    return this.request<GetPortfolioHeroOutput>('GET', '/portfolio/hero');
  }

  getConsolidatedCustody(): Promise<GetConsolidatedCustodyOutput> {
    return this.request<GetConsolidatedCustodyOutput>('GET', '/consolidated-custody');
  }

  getUserWallets(): Promise<GetUserWalletsOutput> {
    return this.request<GetUserWalletsOutput>('GET', '/user/wallets');
  }
}
