import type { MockProfile } from './profile';

/**
 * A sandbox marker is a fake access token of the form
 * `app_sandbox_<tenant>_<profile>`. The tenant segment may contain lowercase
 * letters, digits and underscores; the profile is one of the mock profiles.
 */
export const SANDBOX_MARKER_RE = /^app_sandbox_([a-z0-9_]+)_(happyPath|empty|error|slow)$/;

export interface SandboxMarker {
  tenant: string;
  profile: MockProfile;
}

/** Fast-path check used before attempting to decode a token as a JWT. */
export function isSandboxMarker(token: string): boolean {
  return SANDBOX_MARKER_RE.test(token);
}

export function parseSandboxMarker(token: string): SandboxMarker | null {
  const match = SANDBOX_MARKER_RE.exec(token);
  if (!match) return null;
  const tenant = match[1];
  const profile = match[2];
  if (tenant === undefined || profile === undefined) return null;
  return { tenant, profile: profile as MockProfile };
}
