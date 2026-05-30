import type { DependencyContainer } from 'tsyringe';
import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';
import { ICORE_GATEWAY_TOKEN, type ICoreGateway } from '../../application/ports';
import { container } from './container';
import {
  ACCESS_TOKEN_TOKEN,
  CUSTOMER_ID_TOKEN,
  EXECUTION_CONTEXT_TOKEN,
  TENANT_ID_TOKEN,
} from './tokens';

/**
 * Placeholder gateway. The real binding (CoreHttpGateway for live,
 * CoreMockGateway for sandbox/mock) is selected by mode + dataSource in F2;
 * until then any operation rejects so misuse is loud rather than silent.
 */
function createCoreGatewayStub(): ICoreGateway {
  return new Proxy({} as ICoreGateway, {
    get(_target, operation) {
      return () =>
        Promise.reject(new Error(`ICoreGateway.${String(operation)} is not implemented until F2`));
    },
  });
}

/**
 * Request container — a child of the root created per request (manual, Parte 2.6.1).
 * Carries the resolved ExecutionContext and the access token down to adapters.
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
  requestContainer.registerInstance<ICoreGateway>(ICORE_GATEWAY_TOKEN, createCoreGatewayStub());
  return requestContainer;
}
