import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';
import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';
import { ILOGGER_TOKEN, type ILogger } from '../../../application/ports';
import type { GetPortfolioHeroUseCase } from '../../../application/useCases';
import { EXECUTION_CONTEXT_TOKEN } from '../../../infra/di/tokens';
import { GET_PORTFOLIO_HERO_USE_CASE_TOKEN } from '../../../infra/di/generated/tokens';
import { MockGatewayError } from '../../../infra/gateway/mock';
import { buildLogContext, internalError, mockGatewayError, validationError } from '../../http';
import { GetPortfolioHeroSchema } from './schemas';

/** Controller (manual, Parte 2.5.1) for `GET /api/portfolio-details/hero`. */
@injectable()
export class GetPortfolioHeroController {
  constructor(
    @inject(GET_PORTFOLIO_HERO_USE_CASE_TOKEN)
    private readonly getPortfolioHeroUseCase: GetPortfolioHeroUseCase,
    @inject(EXECUTION_CONTEXT_TOKEN) private readonly executionContext: ExecutionContext,
    @inject(ILOGGER_TOKEN) private readonly logger: ILogger,
  ) {}

  async handle(_request: Request): Promise<Response> {
    const log = buildLogContext(this.executionContext, 'getPortfolioHero');
    this.logger.info('request_start', log);

    try {
      const validation = GetPortfolioHeroSchema.safeParse({
        customerId: this.executionContext.customerId,
      });
      if (!validation.success) {
        this.logger.warn('validation_failed', log);
        return validationError(validation.error);
      }

      const result = await this.getPortfolioHeroUseCase.execute(validation.data);
      this.logger.info('getPortfolioHero_completed', log);
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
