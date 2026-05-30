import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';
import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';
import { ILOGGER_TOKEN, type ILogger } from '../../../application/ports';
import { GetPortfolioBuilderPreviewUseCase } from '../../../application/useCases';
import { EXECUTION_CONTEXT_TOKEN } from '../../../infra';
import { MockGatewayError } from '../../../infra/gateway/mock';
import { buildLogContext, internalError, mockGatewayError, validationError } from '../../http';
import { GetPortfolioBuilderPreviewSchema } from './schemas';

/** Controller (manual, Parte 2.5.1) for `GET /api/portfolio-builder/preview?riskLevel=`. */
@injectable()
export class GetPortfolioBuilderPreviewController {
  constructor(
    @inject(GetPortfolioBuilderPreviewUseCase)
    private readonly getPortfolioBuilderPreviewUseCase: GetPortfolioBuilderPreviewUseCase,
    @inject(EXECUTION_CONTEXT_TOKEN) private readonly executionContext: ExecutionContext,
    @inject(ILOGGER_TOKEN) private readonly logger: ILogger,
  ) {}

  async handle(request: Request): Promise<Response> {
    const log = buildLogContext(this.executionContext, 'getPortfolioBuilderPreview');
    this.logger.info('request_start', log);

    try {
      const riskLevel = new URL(request.url).searchParams.get('riskLevel') ?? undefined;
      const validation = GetPortfolioBuilderPreviewSchema.safeParse({
        customerId: this.executionContext.customerId,
        riskLevel,
      });
      if (!validation.success) {
        this.logger.warn('validation_failed', log);
        return validationError(validation.error);
      }

      const result = await this.getPortfolioBuilderPreviewUseCase.execute(validation.data);
      this.logger.info('getPortfolioBuilderPreview_completed', log);
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
