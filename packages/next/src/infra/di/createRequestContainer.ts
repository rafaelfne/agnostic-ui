import type { DependencyContainer } from 'tsyringe';
import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';
import { registerServicesInContainer } from '../gateway/registerServicesInContainer';
import { container } from './container';
import {
  ACCESS_TOKEN_TOKEN,
  CUSTOMER_ID_TOKEN,
  EXECUTION_CONTEXT_TOKEN,
  TENANT_ID_TOKEN,
} from './tokens';

/**
 * Request container — a child of the root created per request (manual, Parte 2.6.1).
 * Registers the resolved ExecutionContext and access token, then binds the
 * request-scoped services (gateway selected by mode × dataSource).
 */
export function createRequestContainer(
  ctx: ExecutionContext,
  accessToken = '',
): DependencyContainer {
  const requestContainer = container.createChildContainer();
  requestContainer.registerInstance(EXECUTION_CONTEXT_TOKEN, ctx);
  requestContainer.registerInstance(TENANT_ID_TOKEN, ctx.tenantId);
  requestContainer.registerInstance(CUSTOMER_ID_TOKEN, ctx.customerId);
  requestContainer.registerInstance(ACCESS_TOKEN_TOKEN, accessToken);
  registerServicesInContainer(requestContainer, ctx);
  return requestContainer;
}
