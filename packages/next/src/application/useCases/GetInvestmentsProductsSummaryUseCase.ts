import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';
import {
  ICORE_GATEWAY_TOKEN,
  type GetInvestmentsProductsSummaryInput,
  type GetInvestmentsProductsSummaryOutput,
  type ICoreGateway,
} from '../ports';

/** Use case (manual, Parte 2.3.3): a thin proxy over `ICoreGateway.getInvestmentsProductsSummary`. */
@injectable()
export class GetInvestmentsProductsSummaryUseCase {
  constructor(@inject(ICORE_GATEWAY_TOKEN) private readonly gateway: ICoreGateway) {}

  execute(input: GetInvestmentsProductsSummaryInput): Promise<GetInvestmentsProductsSummaryOutput> {
    return this.gateway.getInvestmentsProductsSummary(input);
  }
}
