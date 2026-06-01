import type { DependencyContainer } from 'tsyringe';
import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';
import { ICORE_GATEWAY_TOKEN, type ICoreGateway } from '../../application/ports';
import { getTenantConfig } from '../tenant/tenantConfigStore';
import { CoreMockGateway } from './mock/CoreMockGateway';
import { CoreHttpGateway } from './http/CoreHttpGateway';

type CoreGatewayClass = typeof CoreMockGateway | typeof CoreHttpGateway;

/**
 * Picks the gateway implementation for the request (manual, Parte 2.6.2):
 * sandbox always serves mock data; a live request follows the tenant
 * `dataSource` (`mock` → mock, otherwise → HTTP). Unknown tenants default to
 * HTTP so a misconfiguration never silently falls back to sandbox data in
 * production. Exactly one gateway is bound per request — the Mock ↔ Core
 * boundary is never crossed within a single execution.
 */
function selectGatewayClass(ctx: ExecutionContext): CoreGatewayClass {
  if (ctx.mode === 'sandbox') {
    return CoreMockGateway;
  }
  return getTenantConfig(ctx.tenantId)?.dataSource === 'mock' ? CoreMockGateway : CoreHttpGateway;
}

/**
 * Binds the request-scoped services onto the child container (manual, Parte
 * 2.6.1). F2 wires the core gateway; later features register further adapters
 * (cache, token provider) here.
 */
export function registerServicesInContainer(
  requestContainer: DependencyContainer,
  ctx: ExecutionContext,
): void {
  requestContainer.register<ICoreGateway>(ICORE_GATEWAY_TOKEN, {
    useClass: selectGatewayClass(ctx),
  });
}
