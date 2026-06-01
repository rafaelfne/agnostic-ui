import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';
import {
  ICORE_GATEWAY_TOKEN,
  type GetCatalogCategoryInput,
  type GetCatalogCategoryOutput,
  type ICoreGateway,
} from '../ports';

/** Use case (manual, Parte 2.3.3): a thin proxy over `ICoreGateway.getCatalogCategory`. */
@injectable()
export class GetCatalogCategoryUseCase {
  constructor(@inject(ICORE_GATEWAY_TOKEN) private readonly gateway: ICoreGateway) {}

  execute(input: GetCatalogCategoryInput): Promise<GetCatalogCategoryOutput> {
    return this.gateway.getCatalogCategory(input);
  }
}
