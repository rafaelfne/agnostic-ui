import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';
import {
  ICORE_GATEWAY_TOKEN,
  type GetPortfolioBuilderRiskSelectInput,
  type GetPortfolioBuilderRiskSelectOutput,
  type ICoreGateway,
} from '../ports';

/** Use case (manual, Parte 2.3.3): a thin proxy over `ICoreGateway.getPortfolioBuilderRiskSelect`. */
@injectable()
export class GetPortfolioBuilderRiskSelectUseCase {
  constructor(@inject(ICORE_GATEWAY_TOKEN) private readonly gateway: ICoreGateway) {}

  execute(input: GetPortfolioBuilderRiskSelectInput): Promise<GetPortfolioBuilderRiskSelectOutput> {
    return this.gateway.getPortfolioBuilderRiskSelect(input);
  }
}
