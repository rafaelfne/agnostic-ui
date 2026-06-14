// AUTO-GERADO por scripts/generate-di.mjs — não editar à mão (manual §2.5.3).
// Rode `pnpm --filter @yukilabs/agnostic-ui-next gen:di` após adicionar use case ou controller.

import type { DependencyContainer } from 'tsyringe';
import {} from '../../../application/useCases';
import {} from '../../../interface/controllers';
import {} from './tokens';

/**
 * Registra use cases e controllers no container raiz (manual §2.6.1). Transient:
 * cada `resolve` constrói uma instância nova, então as dependências request-scoped
 * (gateway, executionContext) resolvem do child container que iniciou o `resolve`.
 */
export function registerGeneratedServices(_container: DependencyContainer): void {}
