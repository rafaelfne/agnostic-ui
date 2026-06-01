import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';
import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';
import { ILOGGER_TOKEN, type ILogger } from '../../../application/ports';
import type { GetBalanceUseCase } from '../../../application/useCases';
import { EXECUTION_CONTEXT_TOKEN } from '../../../infra/di/tokens';
import { GET_BALANCE_USE_CASE_TOKEN } from '../../../infra/di/generated/tokens';
import { MockGatewayError } from '../../../infra/gateway/mock';
import { buildLogContext, internalError, mockGatewayError, validationError } from '../../http';
import { GetBalanceSchema } from './schemas';

/**
 * Controller (manual, Parte 2.5.1): the uniform `validate → log → execute →
 * respond` pipeline. `customerId` is taken from the injected `executionContext`
 * (never the client); a fired mock `error` profile surfaces as `mock_gateway_error`.
 */
@injectable()
export class BalanceController {
  constructor(
    @inject(GET_BALANCE_USE_CASE_TOKEN) private readonly getBalanceUseCase: GetBalanceUseCase,
    @inject(EXECUTION_CONTEXT_TOKEN) private readonly executionContext: ExecutionContext,
    @inject(ILOGGER_TOKEN) private readonly logger: ILogger,
  ) {}

  async handle(_request: Request): Promise<Response> {
    const log = buildLogContext(this.executionContext, 'getBalance');
    this.logger.info('request_start', log);

    try {
      const validation = GetBalanceSchema.safeParse({
        customerId: this.executionContext.customerId,
      });
      if (!validation.success) {
        this.logger.warn('validation_failed', log);
        return validationError(validation.error);
      }

      const result = await this.getBalanceUseCase.execute(validation.data);
      this.logger.info('getBalance_completed', log);
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
