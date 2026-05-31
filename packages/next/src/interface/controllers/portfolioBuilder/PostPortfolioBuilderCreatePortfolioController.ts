import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';
import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';
import { ILOGGER_TOKEN, type ILogger } from '../../../application/ports';
import { PostPortfolioBuilderCreatePortfolioUseCase } from '../../../application/useCases';
import { EXECUTION_CONTEXT_TOKEN } from '../../../infra/di/tokens';
import { MockGatewayError } from '../../../infra/gateway/mock';
import {
  buildLogContext,
  internalError,
  mockGatewayError,
  readJsonBody,
  validationError,
} from '../../http';
import { PostPortfolioBuilderCreatePortfolioSchema } from './schemas';

/** Controller (manual, Parte 2.5.1) for `POST /api/portfolio-builder/create`. */
@injectable()
export class PostPortfolioBuilderCreatePortfolioController {
  constructor(
    @inject(PostPortfolioBuilderCreatePortfolioUseCase)
    private readonly postPortfolioBuilderCreatePortfolioUseCase: PostPortfolioBuilderCreatePortfolioUseCase,
    @inject(EXECUTION_CONTEXT_TOKEN) private readonly executionContext: ExecutionContext,
    @inject(ILOGGER_TOKEN) private readonly logger: ILogger,
  ) {}

  async handle(request: Request): Promise<Response> {
    const log = buildLogContext(this.executionContext, 'postPortfolioBuilderCreatePortfolio');
    this.logger.info('request_start', log);

    try {
      const body = await readJsonBody(request);
      const validation = PostPortfolioBuilderCreatePortfolioSchema.safeParse({
        ...body,
        customerId: this.executionContext.customerId,
      });
      if (!validation.success) {
        this.logger.warn('validation_failed', log);
        return validationError(validation.error);
      }

      const result = await this.postPortfolioBuilderCreatePortfolioUseCase.execute(validation.data);
      this.logger.info('postPortfolioBuilderCreatePortfolio_completed', log);
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
