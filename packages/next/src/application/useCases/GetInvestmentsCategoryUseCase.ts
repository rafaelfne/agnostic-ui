import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';
import {
  ICORE_GATEWAY_TOKEN,
  type GetInvestmentsCategoryInput,
  type GetInvestmentsCategoryOutput,
  type ICoreGateway,
} from '../ports';

/** Use case (manual, Parte 2.3.3): a thin proxy over `ICoreGateway.getInvestmentsCategory`. */
@injectable()
export class GetInvestmentsCategoryUseCase {
  constructor(@inject(ICORE_GATEWAY_TOKEN) private readonly gateway: ICoreGateway) {}

  execute(input: GetInvestmentsCategoryInput): Promise<GetInvestmentsCategoryOutput> {
    return this.gateway.getInvestmentsCategory(input);
  }
}
