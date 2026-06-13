import type { InjectionToken } from 'tsyringe';
import type { ICoreGateway } from './coreGateway';
import type { ITokenProvider } from './tokenProvider';
import type { ICache } from './cache';
import type { IConfigRepo } from './configRepo';
import type { IConfigStore } from './configStore';
import type { ILogger } from './logger';
import type { ITenantConfigRepository } from './tenantConfigRepository';

/**
 * DI tokens for the application ports. Ports are interfaces (no runtime value),
 * so they are injected by symbol. Concrete bindings are registered in infra/di.
 */
export const ICORE_GATEWAY_TOKEN: InjectionToken<ICoreGateway> = Symbol('ICoreGateway');
export const ITOKEN_PROVIDER_TOKEN: InjectionToken<ITokenProvider> = Symbol('ITokenProvider');
export const ICACHE_TOKEN: InjectionToken<ICache> = Symbol('ICache');
export const ICONFIG_REPO_TOKEN: InjectionToken<IConfigRepo> = Symbol('IConfigRepo');
export const ICONFIG_STORE_TOKEN: InjectionToken<IConfigStore> = Symbol('IConfigStore');
export const ILOGGER_TOKEN: InjectionToken<ILogger> = Symbol('ILogger');
export const ITENANT_CONFIG_REPOSITORY_TOKEN: InjectionToken<ITenantConfigRepository> =
  Symbol('ITenantConfigRepository');
