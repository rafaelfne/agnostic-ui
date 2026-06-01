import 'reflect-metadata';
import { container } from 'tsyringe';
import { ILOGGER_TOKEN, ITENANT_CONFIG_REPOSITORY_TOKEN } from '../../application/ports';
import { StructuredLogger } from '../logging/StructuredLogger';
import { TenantConfigRepository } from '../tenant/TenantConfigRepository';
import { registerGeneratedServices } from './generated/registry';

/**
 * Root container — initialised once at boot (manual, Parte 2.6.1). Holds infra
 * singletons that are independent of the request scope, plus the auto-generated
 * use case + controller registry (manual, Parte 2.5.3). Per-request bindings
 * (ExecutionContext, gateway) live in the child container.
 */
container.registerSingleton(ILOGGER_TOKEN, StructuredLogger);
container.registerSingleton(ITENANT_CONFIG_REPOSITORY_TOKEN, TenantConfigRepository);
registerGeneratedServices(container);

export { container };
