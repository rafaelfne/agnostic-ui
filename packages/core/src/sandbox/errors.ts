export const SANDBOX_ERROR_CODES = [
  'invalid_sandbox_marker',
  'unknown_tenant',
  'missing_subject',
  'invalid_jwt',
  'tenant_mismatch',
] as const;
export type SandboxErrorCode = (typeof SANDBOX_ERROR_CODES)[number];

/** Canonical HTTP status for each resolution error (see the technical manual). */
export const ERROR_HTTP_STATUS: Record<SandboxErrorCode, number> = {
  invalid_sandbox_marker: 400,
  unknown_tenant: 400,
  missing_subject: 401,
  invalid_jwt: 401,
  tenant_mismatch: 403,
};
