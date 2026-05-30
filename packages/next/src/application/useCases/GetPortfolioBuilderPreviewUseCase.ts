import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';
import {
  ICORE_GATEWAY_TOKEN,
  type GetPortfolioBuilderPreviewInput,
  type GetPortfolioBuilderPreviewOutput,
  type ICoreGateway,
} from '../ports';

/** Use case (manual, Parte 2.3.3): a thin proxy over `ICoreGateway.getPortfolioBuilderPreview`. */
@injectable()
export class GetPortfolioBuilderPreviewUseCase {
  constructor(@inject(ICORE_GATEWAY_TOKEN) private readonly gateway: ICoreGateway) {}

  execute(input: GetPortfolioBuilderPreviewInput): Promise<GetPortfolioBuilderPreviewOutput> {
    return this.gateway.getPortfolioBuilderPreview(input);
  }
}
