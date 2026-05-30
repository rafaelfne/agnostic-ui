import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';
import {
  ICORE_GATEWAY_TOKEN,
  type GetPortfolioHeroInput,
  type GetPortfolioHeroOutput,
  type ICoreGateway,
} from '../ports';

/** Use case (manual, Parte 2.3.3): a thin proxy over `ICoreGateway.getPortfolioHero`. */
@injectable()
export class GetPortfolioHeroUseCase {
  constructor(@inject(ICORE_GATEWAY_TOKEN) private readonly gateway: ICoreGateway) {}

  execute(input: GetPortfolioHeroInput): Promise<GetPortfolioHeroOutput> {
    return this.gateway.getPortfolioHero(input);
  }
}
