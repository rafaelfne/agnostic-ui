import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';
import {
  ICORE_GATEWAY_TOKEN,
  type ICoreGateway,
  type PostInvestAmountInput,
  type PostInvestAmountOutput,
} from '../ports';

/** Use case (manual, Parte 2.3.3): a thin proxy over `ICoreGateway.postInvestAmount`. */
@injectable()
export class PostInvestAmountUseCase {
  constructor(@inject(ICORE_GATEWAY_TOKEN) private readonly gateway: ICoreGateway) {}

  execute(input: PostInvestAmountInput): Promise<PostInvestAmountOutput> {
    return this.gateway.postInvestAmount(input);
  }
}
