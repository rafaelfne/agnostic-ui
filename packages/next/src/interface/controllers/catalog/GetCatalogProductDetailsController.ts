import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';
import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';
import { ILOGGER_TOKEN, type ILogger } from '../../../application/ports';
import type { GetCatalogProductDetailsUseCase } from '../../../application/useCases';
import { EXECUTION_CONTEXT_TOKEN } from '../../../infra/di/tokens';
import { GET_CATALOG_PRODUCT_DETAILS_USE_CASE_TOKEN } from '../../../infra/di/generated/tokens';
import { MockGatewayError } from '../../../infra/gateway/mock';
import { buildLogContext, internalError, mockGatewayError, validationError } from '../../http';
import { GetCatalogProductDetailsSchema } from './schemas';

/** Controller (manual, Parte 2.5.1) for `GET /api/catalog/product-details?productId=`. */
@injectable()
export class GetCatalogProductDetailsController {
  constructor(
    @inject(GET_CATALOG_PRODUCT_DETAILS_USE_CASE_TOKEN)
    private readonly getCatalogProductDetailsUseCase: GetCatalogProductDetailsUseCase,
    @inject(EXECUTION_CONTEXT_TOKEN) private readonly executionContext: ExecutionContext,
    @inject(ILOGGER_TOKEN) private readonly logger: ILogger,
  ) {}

  async handle(request: Request): Promise<Response> {
    const log = buildLogContext(this.executionContext, 'getCatalogProductDetails');
    this.logger.info('request_start', log);

    try {
      const productId = new URL(request.url).searchParams.get('productId') ?? undefined;
      const validation = GetCatalogProductDetailsSchema.safeParse({
        customerId: this.executionContext.customerId,
        productId,
      });
      if (!validation.success) {
        this.logger.warn('validation_failed', log);
        return validationError(validation.error);
      }

      const result = await this.getCatalogProductDetailsUseCase.execute(validation.data);
      this.logger.info('getCatalogProductDetails_completed', log);
      return Response.json(result, { status: 200 });
    } catch (error) {
      this.logger.error('request_error', { ...log, error: (error as Error).message });
      if (error instanceof MockGatewayError) {
        return mockGatewayError();
      }
      return internalError();
    }
  }
}
