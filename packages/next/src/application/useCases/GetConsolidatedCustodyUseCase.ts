import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';
import {
  ICORE_GATEWAY_TOKEN,
  type GetConsolidatedCustodyInput,
  type GetConsolidatedCustodyOutput,
  type ICoreGateway,
} from '../ports';

/** Use case (manual, Parte 2.3.3): a thin proxy over `ICoreGateway.getConsolidatedCustody`. */
@injectable()
export class GetConsolidatedCustodyUseCase {
  constructor(@inject(ICORE_GATEWAY_TOKEN) private readonly gateway: ICoreGateway) {}

  execute(input: GetConsolidatedCustodyInput): Promise<GetConsolidatedCustodyOutput> {
    return this.gateway.getConsolidatedCustody(input);
  }
}
