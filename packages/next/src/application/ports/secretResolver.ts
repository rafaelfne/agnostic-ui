/**
 * Port: resolves a `secretRef` (or any named reference like a base URL / allowlist)
 * to its value (ADR 0003 §6). Config never stores the value, only the name. The
 * resolver reads from a secret store — Supabase Vault in prod, env locally — and is
 * fail-closed: a missing reference resolves to `null`, and the caller must refuse
 * to proceed.
 */
export interface ISecretResolver {
  resolve(ref: string): Promise<string | null>;
}
