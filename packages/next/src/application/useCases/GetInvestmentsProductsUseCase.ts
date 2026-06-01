import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';
import {
  ICORE_GATEWAY_TOKEN,
  type GetInvestmentsProductsInput,
  type GetInvestmentsProductsOutput,
  type ICoreGateway,
} from '../ports';

/** Use case (manual, Parte 2.3.3): a thin proxy over `ICoreGateway.getInvestmentsProducts`. */
@injectable()
export class GetInvestmentsProductsUseCase {
  constructor(@inject(ICORE_GATEWAY_TOKEN) private readonly gateway: ICoreGateway) {}

  execute(input: GetInvestmentsProductsInput): Promise<GetInvestmentsProductsOutput> {
    return this.gateway.getInvestmentsProducts(input);
  }
}
