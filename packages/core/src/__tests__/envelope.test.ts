import { describe, it, expect } from 'vitest';
import { EnvelopeSchema } from '../bridge/envelope';
import { BRIDGE_MESSAGE_TYPES } from '../bridge/constants';
import { BRIDGE_VERSION } from '../version';

const VALID_UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

function baseEnvelope() {
  return {
    id: VALID_UUID,
    origin: 'app',
    type: 'request',
    method: 'getEnvInfo',
    meta: { bridgeVersion: BRIDGE_VERSION, tenantId: 'partnerco' },
  };
}

describe('EnvelopeSchema', () => {
  it('accepts all four message types', () => {
    for (const type of BRIDGE_MESSAGE_TYPES) {
      expect(EnvelopeSchema.safeParse({ ...baseEnvelope(), type }).success).toBe(true);
    }
  });

  it('rejects an unknown type', () => {
    expect(EnvelopeSchema.safeParse({ ...baseEnvelope(), type: 'broadcast' }).success).toBe(false);
  });

  it('rejects an unknown origin', () => {
    expect(EnvelopeSchema.safeParse({ ...baseEnvelope(), origin: 'server' }).success).toBe(false);
  });

  it('requires a uuid id', () => {
    expect(EnvelopeSchema.safeParse({ ...baseEnvelope(), id: 'not-a-uuid' }).success).toBe(false);
  });

  it('requires meta with bridgeVersion and tenantId', () => {
    const { meta: _meta, ...withoutMeta } = baseEnvelope();
    expect(EnvelopeSchema.safeParse(withoutMeta).success).toBe(false);
  });

  it('parses a well-formed error envelope', () => {
    const result = EnvelopeSchema.safeParse({
      id: VALID_UUID,
      origin: 'sdk',
      type: 'error',
      error: { code: 'invalid_jwt', message: 'bad token' },
      meta: { bridgeVersion: BRIDGE_VERSION, tenantId: 'partnerco' },
    });
    expect(result.success).toBe(true);
  });
});
