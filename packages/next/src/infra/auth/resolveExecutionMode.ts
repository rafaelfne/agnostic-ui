import { parseSandboxMarker, type ExecutionContext } from '@yukilabs/agnostic-ui-core';
import { assertTenantExists } from './assertTenantExists';
import { SandboxResolutionError } from './httpError';
import { verifyJwt } from './verifyJwt';

const SANDBOX_MARKER_PREFIX = 'app_sandbox_';

/**
 * Resolves the execution mode from the access token, once per request
 * (manual, Parte 2.4.3 / 6.4):
 *
 *  - A token that begins with `app_sandbox_` takes the sandbox branch. A bad
 *    format is `invalid_sandbox_marker` (400) and an unregistered tenant is
 *    `unknown_tenant` (400). The customerId is synthesised as
 *    `cus_test_<profile>_<tenant>`.
 *  - Anything else is treated as a live JWT: its signature is verified
 *    (`verifyJwt`, F6 hardening) — a bad/expired/unsigned token or a missing
 *    key is `invalid_jwt` (401) — and it must carry a `sub` claim
 *    (`missing_subject`, 401).
 *
 * Async because signature verification (`jose`) is async.
 */
export async function resolveExecutionMode(token: string): Promise<ExecutionContext> {
  if (token.startsWith(SANDBOX_MARKER_PREFIX)) {
    const parsed = parseSandboxMarker(token);
    if (!parsed) {
      throw new SandboxResolutionError('invalid_sandbox_marker');
    }
    assertTenantExists(parsed.tenant);
    return {
      mode: 'sandbox',
      tenantId: parsed.tenant,
      customerId: `cus_test_${parsed.profile}_${parsed.tenant}`,
      mockProfile: parsed.profile,
    };
  }

  let claims;
  try {
    claims = await verifyJwt(token);
  } catch {
    throw new SandboxResolutionError('invalid_jwt');
  }
  if (!claims.sub) {
    throw new SandboxResolutionError('missing_subject');
  }
  return {
    mode: 'live',
    tenantId: typeof claims.tenant === 'string' ? claims.tenant : '',
    customerId: claims.sub,
  };
}
