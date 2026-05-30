import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';
import {
  ICORE_GATEWAY_TOKEN,
  type GetBalanceInput,
  type GetBalanceOutput,
  type ICoreGateway,
} from '../ports';

/**
 * Use case (manual, Parte 2.3.3): a thin proxy over `ICoreGateway.getBalance`.
 * Validation lives in the controller; domain logic (calculations, rules) would
 * land here when it exists.
 */
@injectable()
export class GetBalanceUseCase {
  constructor(@inject(ICORE_GATEWAY_TOKEN) private readonly gateway: ICoreGateway) {}

  execute(input: GetBalanceInput): Promise<GetBalanceOutput> {
    return this.gateway.getBalance(input);
  }
}
