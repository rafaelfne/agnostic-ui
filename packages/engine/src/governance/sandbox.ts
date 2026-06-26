import { CapabilityError } from '../errors';
import type { IIntegrationRunner } from '../ports';

import { type OperatorContract, contractRefToString } from './contract';

const CORE_NAMESPACE = 'core';

/**
 * Sandbox de capability (G4): o engine expõe ao operador só o egress que o contrato
 * declara — acesso não declarado lança `CapabilityError` ANTES de qualquer egress.
 *
 * - `pure` → nenhum acesso ao integration runner.
 * - `core.*` não-puro → runner real (primitivo confiável, RFC-gated; a integração
 *   específica vem da config do step).
 * - `<tenant>.*` não-puro → só as integrações em `capabilities.integrations`.
 *
 * Egress/secret/host seguem enforçados downstream pelos conectores (allowlist/anti-SSRF/
 * secret-ref, ADR 0003) — este gate é a camada de capability do operador, não a duplica.
 */
export function gateIntegrationRunner(
  runner: IIntegrationRunner,
  contract: OperatorContract,
): IIntegrationRunner {
  const ref = contractRefToString(contract.ref);

  if (contract.capabilities.pure) {
    return {
      run: () =>
        Promise.reject(new CapabilityError(ref, `pure operator ${ref} cannot access integrations`)),
    };
  }

  if (contract.ref.namespace === CORE_NAMESPACE) {
    return runner;
  }

  const allowed = new Set(contract.capabilities.integrations);
  return {
    run: (call) =>
      allowed.has(call.integration)
        ? runner.run(call)
        : Promise.reject(
            new CapabilityError(
              ref,
              `operator ${ref} did not declare integration '${call.integration}'`,
            ),
          ),
  };
}
