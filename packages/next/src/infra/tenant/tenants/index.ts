import type { TenantConfig } from '@yukilabs/agnostic-ui-core';
import { partnerco } from './partnerco';
import { acme } from './acme';

/**
 * Every tenant descriptor the BFF serves (manual, Parte 3.1). The config-backed
 * source for `tenantConfigStore`: registering a new tenant means adding a
 * descriptor module here, never touching the store or the DI wiring.
 */
export const tenantDescriptors: readonly TenantConfig[] = [partnerco, acme];
