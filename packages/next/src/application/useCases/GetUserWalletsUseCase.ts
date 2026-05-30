import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';
import {
  ICORE_GATEWAY_TOKEN,
  type GetUserWalletsInput,
  type GetUserWalletsOutput,
  type ICoreGateway,
} from '../ports';

/** Use case (manual, Parte 2.3.3): a thin proxy over `ICoreGateway.getUserWallets`. */
@injectable()
export class GetUserWalletsUseCase {
  constructor(@inject(ICORE_GATEWAY_TOKEN) private readonly gateway: ICoreGateway) {}

  execute(input: GetUserWalletsInput): Promise<GetUserWalletsOutput> {
    return this.gateway.getUserWallets(input);
  }
}
