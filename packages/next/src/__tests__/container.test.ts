import { describe, it, expect } from 'vitest';
import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';
import {
  ICORE_GATEWAY_TOKEN,
  ILOGGER_TOKEN,
  ITENANT_CONFIG_REPOSITORY_TOKEN,
} from '../application/ports';
import { createRequestContainer } from '../infra/di';
import {
  ACCESS_TOKEN_TOKEN,
  CUSTOMER_ID_TOKEN,
  EXECUTION_CONTEXT_TOKEN,
  TENANT_ID_TOKEN,
} from '../infra/di/tokens';
import { getBalanceMock } from '../infra/gateway/mock/fixtures';

const liveCtx: ExecutionContext = { mode: 'live', tenantId: 'partnerco', customerId: 'cus_123' };

describe('createRequestContainer', () => {
  it('inherits root singletons (logger, tenant repository)', () => {
    const requestContainer = createRequestContainer(liveCtx, 'tok');
    expect(requestContainer.resolve(ILOGGER_TOKEN)).toBeDefined();
    expect(requestContainer.resolve(ITENANT_CONFIG_REPOSITORY_TOKEN)).toBeDefined();
  });

  it('registers the request-scoped instances', () => {
    const requestContainer = createRequestContainer(liveCtx, 'tok-abc');
    expect(requestContainer.resolve(EXECUTION_CONTEXT_TOKEN)).toBe(liveCtx);
    expect(requestContainer.resolve(TENANT_ID_TOKEN)).toBe('partnerco');
    expect(requestContainer.resolve(CUSTOMER_ID_TOKEN)).toBe('cus_123');
    expect(requestContainer.resolve(ACCESS_TOKEN_TOKEN)).toBe('tok-abc');
  });

  it('isolates scopes across requests', () => {
    const a = createRequestContainer({ ...liveCtx, customerId: 'cus_a' }, 'a');
    const b = createRequestContainer({ ...liveCtx, customerId: 'cus_b' }, 'b');
    expect(a.resolve(CUSTOMER_ID_TOKEN)).toBe('cus_a');
    expect(b.resolve(CUSTOMER_ID_TOKEN)).toBe('cus_b');
  });

  it('binds a working core gateway for the request', async () => {
    const requestContainer = createRequestContainer(liveCtx, 'tok');
    const gateway = requestContainer.resolve(ICORE_GATEWAY_TOKEN);
    await expect(gateway.getBalance({})).resolves.toEqual(getBalanceMock());
  });
});
