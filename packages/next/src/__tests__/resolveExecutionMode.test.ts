import { describe, it, expect } from 'vitest';
import { resolveExecutionMode } from '../infra/auth/resolveExecutionMode';
import { SandboxResolutionError } from '../infra/auth/httpError';

function jwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.signature`;
}

function caught(fn: () => unknown): SandboxResolutionError {
  try {
    fn();
  } catch (error) {
    if (error instanceof SandboxResolutionError) return error;
    throw error;
  }
  throw new Error('expected a SandboxResolutionError to be thrown');
}

describe('resolveExecutionMode', () => {
  describe('sandbox', () => {
    it('resolves a valid marker and synthesises the customerId', () => {
      expect(resolveExecutionMode('app_sandbox_partnerco_happyPath')).toEqual({
        mode: 'sandbox',
        tenantId: 'partnerco',
        customerId: 'cus_test_happyPath_partnerco',
        mockProfile: 'happyPath',
      });
    });

    it('carries the requested mock profile', () => {
      expect(resolveExecutionMode('app_sandbox_partnerco_error')).toMatchObject({
        mockProfile: 'error',
        customerId: 'cus_test_error_partnerco',
      });
    });

    it('rejects a marker with an invalid profile as invalid_sandbox_marker', () => {
      expect(caught(() => resolveExecutionMode('app_sandbox_partnerco_nope')).code).toBe(
        'invalid_sandbox_marker',
      );
    });

    it('rejects an uppercase tenant as invalid_sandbox_marker', () => {
      expect(caught(() => resolveExecutionMode('app_sandbox_PartnerCo_happyPath')).code).toBe(
        'invalid_sandbox_marker',
      );
    });

    it('rejects an unregistered tenant as unknown_tenant', () => {
      expect(caught(() => resolveExecutionMode('app_sandbox_ghostco_happyPath')).code).toBe(
        'unknown_tenant',
      );
    });
  });

  describe('live', () => {
    it('resolves a JWT with sub to live mode', () => {
      expect(resolveExecutionMode(jwt({ sub: 'cus_42', tenant: 'partnerco' }))).toEqual({
        mode: 'live',
        tenantId: 'partnerco',
        customerId: 'cus_42',
      });
    });

    it('defaults tenantId to empty string when the tenant claim is absent', () => {
      expect(resolveExecutionMode(jwt({ sub: 'cus_42' }))).toEqual({
        mode: 'live',
        tenantId: '',
        customerId: 'cus_42',
      });
    });

    it('rejects a JWT without sub as missing_subject', () => {
      expect(caught(() => resolveExecutionMode(jwt({ tenant: 'partnerco' }))).code).toBe(
        'missing_subject',
      );
    });

    it('rejects a token that is neither marker nor JWT as invalid_jwt', () => {
      expect(caught(() => resolveExecutionMode('not-a-token')).code).toBe('invalid_jwt');
    });

    it('rejects an empty token as invalid_jwt', () => {
      expect(caught(() => resolveExecutionMode('')).code).toBe('invalid_jwt');
    });
  });
});
