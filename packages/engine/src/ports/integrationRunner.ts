import type { MockProfile } from '@yukilabs/agnostic-ui-core';

/** A single integration invocation, fully resolved by the engine. */
export interface IntegrationCall {
  integration: string;
  operation: string;
  input: unknown;
  /** Mock profile in effect (sandbox), or undefined in live mode. */
  profile: MockProfile | undefined;
}

/**
 * Port that decouples the engine from any concrete gateway. The `call-integration`
 * operator speaks only this interface; the mock test double (Fase A) and the real
 * REST/GraphQL/Mock adapters (Fase B) both implement it. The engine never mentions
 * "balance" or "core".
 */
export interface IIntegrationRunner {
  run(call: IntegrationCall): Promise<unknown>;
}
