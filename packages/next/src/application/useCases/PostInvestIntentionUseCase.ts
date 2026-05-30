import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';
import {
  ICORE_GATEWAY_TOKEN,
  type ICoreGateway,
  type PostInvestIntentionInput,
  type PostInvestIntentionOutput,
} from '../ports';

/** Use case (manual, Parte 2.3.3): a thin proxy over `ICoreGateway.postInvestIntention`. */
@injectable()
export class PostInvestIntentionUseCase {
  constructor(@inject(ICORE_GATEWAY_TOKEN) private readonly gateway: ICoreGateway) {}

  execute(input: PostInvestIntentionInput): Promise<PostInvestIntentionOutput> {
    return this.gateway.postInvestIntention(input);
  }
}
