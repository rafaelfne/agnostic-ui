import { describe, it, expect } from 'vitest';
import { decodeJwtPayload } from '../auth/jwt';

function toBase64Url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function makeJwt(payload: unknown): string {
  const header = toBase64Url({ alg: 'HS256', typ: 'JWT' });
  return `${header}.${toBase64Url(payload)}.signature`;
}

describe('decodeJwtPayload', () => {
  it('decodes a payload and exposes sub', () => {
    const token = makeJwt({ sub: 'user-123', tenantId: 'partnerco' });
    expect(decodeJwtPayload(token)).toEqual({ sub: 'user-123', tenantId: 'partnerco' });
  });

  it('returns a payload without sub when the claim is absent', () => {
    const payload = decodeJwtPayload(makeJwt({ scope: 'read' }));
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBeUndefined();
  });

  it('decodes base64url payloads with non-ascii data and no padding', () => {
    const token = makeJwt({ sub: 'maçã+/?', note: 'ÿÿÿ' });
    expect(decodeJwtPayload(token)).toEqual({ sub: 'maçã+/?', note: 'ÿÿÿ' });
  });

  it('returns null for a 2-segment token without throwing', () => {
    expect(decodeJwtPayload('header.payload')).toBeNull();
  });

  it('returns null for a non-JWT string', () => {
    expect(decodeJwtPayload('not-a-jwt')).toBeNull();
  });

  it('returns null when the payload is not valid JSON', () => {
    expect(decodeJwtPayload('aaa.!!!notbase64!!!.sig')).toBeNull();
  });
});
