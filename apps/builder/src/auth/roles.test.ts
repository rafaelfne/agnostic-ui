import { describe, expect, it } from 'vitest';

import { canPublish, decodeBuilderRoles } from './roles';

/** Monta um JWT fake (header.payload.sig) com o payload em base64url — sem assinatura real. */
function makeToken(payload: unknown): string {
  const b64 = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'none' })}.${b64(payload)}.sig`;
}

describe('I.4 — decodeBuilderRoles / canPublish (UX gate, não-segurança)', () => {
  it('reads builder_roles from app_metadata', () => {
    const token = makeToken({ app_metadata: { builder_roles: ['editor', 'publisher'] } });
    expect(decodeBuilderRoles(token)).toEqual(['editor', 'publisher']);
    expect(canPublish(token)).toBe(true);
  });

  it('an editor-only token cannot publish', () => {
    const token = makeToken({ app_metadata: { builder_roles: ['editor'] } });
    expect(canPublish(token)).toBe(false);
  });

  it('is empty/false for null, malformed, or role-less tokens', () => {
    expect(decodeBuilderRoles(null)).toEqual([]);
    expect(canPublish(null)).toBe(false);
    expect(decodeBuilderRoles('not-a-jwt')).toEqual([]);
    expect(decodeBuilderRoles(makeToken({ app_metadata: {} }))).toEqual([]);
    expect(decodeBuilderRoles(makeToken({}))).toEqual([]);
  });
});
