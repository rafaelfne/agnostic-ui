import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';
import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';
import { ILOGGER_TOKEN, type ILogger } from '../../../application/ports';
import { GetPortfolioBuilderRiskSelectUseCase } from '../../../application/useCases';
import { EXECUTION_CONTEXT_TOKEN } from '../../../infra';
import { MockGatewayError } from '../../../infra/gateway/mock';
import { buildLogContext, internalError, mockGatewayError, validationError } from '../../http';
import { GetPortfolioBuilderRiskSelectSchema } from './schemas';

/** Controller (manual, Parte 2.5.1) for `GET /api/portfolio-builder/risk-select`. */
@injectable()
export class GetPortfolioBuilderRiskSelectController {
  constructor(
    @inject(GetPortfolioBuilderRiskSelectUseCase)
    private readonly getPortfolioBuilderRiskSelectUseCase: GetPortfolioBuilderRiskSelectUseCase,
    @inject(EXECUTION_CONTEXT_TOKEN) private readonly executionContext: ExecutionContext,
    @inject(ILOGGER_TOKEN) private readonly logger: ILogger,
  ) {}

  async handle(_request: Request): Promise<Response> {
    const log = buildLogContext(this.executionContext, 'getPortfolioBuilderRiskSelect');
    this.logger.info('request_start', log);

    try {
      const validation = GetPortfolioBuilderRiskSelectSchema.safeParse({
        customerId: this.executionContext.customerId,
      });
      if (!validation.success) {
        this.logger.warn('validation_failed', log);
        return validationError(validation.error);
      }

      const result = await this.getPortfolioBuilderRiskSelectUseCase.execute(validation.data);
      this.logger.info('getPortfolioBuilderRiskSelect_completed', log);
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
