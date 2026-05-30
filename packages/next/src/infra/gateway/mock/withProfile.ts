import type { MockProfile } from '@yukilabs/agnostic-ui-core';
import { MockGatewayError } from './MockGatewayError';

/** Latency injected by the `slow` profile before returning the happyPath fixture. */
export const SLOW_PROFILE_DELAY_MS = 3000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ProfileFixtures<T> {
  happyPath: () => T;
  /** Explicit empty-state fixture. Only the four collection ops provide one. */
  empty?: () => T;
  /** Operation name, surfaced on `MockGatewayError` and the empty-fallback warning. */
  operation?: string;
}

/**
 * Reconciles a mock operation against the active `MockProfile` (manual, Parte
 * 2.4.2). `error` and `slow` are universal; `empty` needs an explicit fixture
 * per operation and otherwise falls back to happyPath with a warning. A missing
 * profile (e.g. live mode bound to a mock tenant) resolves to happyPath.
 */
export async function withProfile<T>(
  profile: MockProfile | undefined,
  fns: ProfileFixtures<T>,
): Promise<T> {
  switch (profile) {
    case 'error':
      throw new MockGatewayError(fns.operation);
    case 'slow':
      await delay(SLOW_PROFILE_DELAY_MS);
      return fns.happyPath();
    case 'empty':
      if (fns.empty) return fns.empty();
      console.warn(
        `[mock] no empty fixture for ${fns.operation ?? 'operation'}; falling back to happyPath`,
      );
      return fns.happyPath();
    default:
      return fns.happyPath();
  }
}
