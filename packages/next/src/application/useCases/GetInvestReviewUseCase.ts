import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';
import {
  ICORE_GATEWAY_TOKEN,
  type GetInvestReviewInput,
  type GetInvestReviewOutput,
  type ICoreGateway,
} from '../ports';

/** Use case (manual, Parte 2.3.3): a thin proxy over `ICoreGateway.getInvestReview`. */
@injectable()
export class GetInvestReviewUseCase {
  constructor(@inject(ICORE_GATEWAY_TOKEN) private readonly gateway: ICoreGateway) {}

  execute(input: GetInvestReviewInput): Promise<GetInvestReviewOutput> {
    return this.gateway.getInvestReview(input);
  }
}
