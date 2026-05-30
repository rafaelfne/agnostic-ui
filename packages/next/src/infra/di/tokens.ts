import type { InjectionToken } from 'tsyringe';
import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';

/**
 * Request-scoped DI tokens. Registered per request in the child container
 * (manual, Parte 2.6). String tokens mirror the manual's `@inject("executionContext")`.
 */
export const EXECUTION_CONTEXT_TOKEN: InjectionToken<ExecutionContext> = 'executionContext';
export const TENANT_ID_TOKEN: InjectionToken<string> = 'tenantId';
export const CUSTOMER_ID_TOKEN: InjectionToken<string> = 'customerId';
export const ACCESS_TOKEN_TOKEN: InjectionToken<string> = 'accessToken';
