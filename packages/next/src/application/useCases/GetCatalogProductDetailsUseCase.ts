import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';
import {
  ICORE_GATEWAY_TOKEN,
  type GetCatalogProductDetailsInput,
  type GetCatalogProductDetailsOutput,
  type ICoreGateway,
} from '../ports';

/** Use case (manual, Parte 2.3.3): a thin proxy over `ICoreGateway.getCatalogProductDetails`. */
@injectable()
export class GetCatalogProductDetailsUseCase {
  constructor(@inject(ICORE_GATEWAY_TOKEN) private readonly gateway: ICoreGateway) {}

  execute(input: GetCatalogProductDetailsInput): Promise<GetCatalogProductDetailsOutput> {
    return this.gateway.getCatalogProductDetails(input);
  }
}
