import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';
import {
  ICORE_GATEWAY_TOKEN,
  type ICoreGateway,
  type PostPortfolioBuilderCreatePortfolioInput,
  type PostPortfolioBuilderCreatePortfolioOutput,
} from '../ports';

/** Use case (manual, Parte 2.3.3): a thin proxy over `ICoreGateway.postPortfolioBuilderCreatePortfolio`. */
@injectable()
export class PostPortfolioBuilderCreatePortfolioUseCase {
  constructor(@inject(ICORE_GATEWAY_TOKEN) private readonly gateway: ICoreGateway) {}

  execute(
    input: PostPortfolioBuilderCreatePortfolioInput,
  ): Promise<PostPortfolioBuilderCreatePortfolioOutput> {
    return this.gateway.postPortfolioBuilderCreatePortfolio(input);
  }
}
