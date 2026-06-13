import type { ISecretResolver } from '../../application/ports';

/**
 * Resolves references from environment variables (local / self-host). The ref is
 * the env var name; an unset or empty value resolves to `null` (fail-closed).
 * Production swaps this for a Vault-backed resolver behind the same port.
 */
export class EnvSecretResolver implements ISecretResolver {
  constructor(private readonly env: Record<string, string | undefined> = process.env) {}

  resolve(ref: string): Promise<string | null> {
    const value = this.env[ref];
    return Promise.resolve(value === undefined || value === '' ? null : value);
  }
}
