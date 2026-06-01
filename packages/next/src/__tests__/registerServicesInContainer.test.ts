import { describe, it, expect } from 'vitest';
import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';
import { ICORE_GATEWAY_TOKEN } from '../application/ports';
import { createRequestContainer } from '../infra/di';
import { CoreMockGateway } from '../infra/gateway/mock/CoreMockGateway';
import { CoreHttpGateway } from '../infra/gateway/http/CoreHttpGateway';

const sandboxCtx: ExecutionContext = {
  mode: 'sandbox',
  tenantId: 'partnerco',
  customerId: 'cus_test_happyPath_partnerco',
  mockProfile: 'happyPath',
};

describe('registerServicesInContainer (gateway selection)', () => {
  it('binds the mock gateway for sandbox requests', () => {
    const gateway = createRequestContainer(sandboxCtx, '').resolve(ICORE_GATEWAY_TOKEN);
    expect(gateway).toBeInstanceOf(CoreMockGateway);
  });

  it('binds the mock gateway for a live request on a mock-dataSource tenant', () => {
    const ctx: ExecutionContext = { mode: 'live', tenantId: 'partnerco', customerId: 'cus_1' };
    const gateway = createRequestContainer(ctx, 'tok').resolve(ICORE_GATEWAY_TOKEN);
    expect(gateway).toBeInstanceOf(CoreMockGateway);
  });

  // An unknown tenant exercises the same non-mock branch as a `core` dataSource:
  // the live default must be HTTP, never a silent fallback to sandbox data.
  it('defaults to the HTTP gateway for a live request on an unknown tenant', () => {
    const ctx: ExecutionContext = { mode: 'live', tenantId: 'unknown-co', customerId: 'cus_1' };
    const gateway = createRequestContainer(ctx, 'tok').resolve(ICORE_GATEWAY_TOKEN);
    expect(gateway).toBeInstanceOf(CoreHttpGateway);
  });
});
