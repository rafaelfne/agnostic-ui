import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';
import {
  ICORE_GATEWAY_TOKEN,
  type GetInvestFlowInput,
  type GetInvestFlowOutput,
  type ICoreGateway,
} from '../ports';

/** Use case (manual, Parte 2.3.3): a thin proxy over `ICoreGateway.getInvestFlow`. */
@injectable()
export class GetInvestFlowUseCase {
  constructor(@inject(ICORE_GATEWAY_TOKEN) private readonly gateway: ICoreGateway) {}

  execute(input: GetInvestFlowInput): Promise<GetInvestFlowOutput> {
    return this.gateway.getInvestFlow(input);
  }
}
