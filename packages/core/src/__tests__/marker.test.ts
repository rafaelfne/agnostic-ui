import { describe, it, expect } from 'vitest';
import { isSandboxMarker, parseSandboxMarker, SANDBOX_MARKER_RE } from '../sandbox/marker';

describe('parseSandboxMarker', () => {
  it('parses each valid profile', () => {
    expect(parseSandboxMarker('app_sandbox_partnerco_happyPath')).toEqual({
      tenant: 'partnerco',
      profile: 'happyPath',
    });
    expect(parseSandboxMarker('app_sandbox_partnerco_empty')).toEqual({
      tenant: 'partnerco',
      profile: 'empty',
    });
    expect(parseSandboxMarker('app_sandbox_sample_error')).toEqual({
      tenant: 'sample',
      profile: 'error',
    });
    expect(parseSandboxMarker('app_sandbox_partnerco_slow')).toEqual({
      tenant: 'partnerco',
      profile: 'slow',
    });
  });

  it('accepts tenant ids with underscores and digits', () => {
    expect(parseSandboxMarker('app_sandbox_partner_co_2_happyPath')).toEqual({
      tenant: 'partner_co_2',
      profile: 'happyPath',
    });
  });

  it('rejects an uppercase tenant', () => {
    expect(parseSandboxMarker('app_sandbox_PartnerCo_happyPath')).toBeNull();
  });

  it('rejects an unknown profile', () => {
    expect(parseSandboxMarker('app_sandbox_partnerco_unknown')).toBeNull();
  });

  it('rejects a marker with no profile', () => {
    expect(parseSandboxMarker('app_sandbox_partnerco')).toBeNull();
  });

  it('rejects a JWT-looking token', () => {
    expect(parseSandboxMarker('eyJhbG.eyJzdWIi.sig')).toBeNull();
  });
});

describe('isSandboxMarker', () => {
  it('agrees with parseSandboxMarker', () => {
    const samples = [
      'app_sandbox_partnerco_happyPath',
      'app_sandbox_sample_error',
      'app_sandbox_PartnerCo_happyPath',
      'app_sandbox_partnerco_unknown',
      'not-a-marker',
    ];
    for (const token of samples) {
      expect(isSandboxMarker(token)).toBe(parseSandboxMarker(token) !== null);
    }
  });

  it('is anchored at both ends', () => {
    expect(SANDBOX_MARKER_RE.source.startsWith('^')).toBe(true);
    expect(SANDBOX_MARKER_RE.source.endsWith('$')).toBe(true);
    expect(isSandboxMarker(' app_sandbox_partnerco_happyPath')).toBe(false);
    expect(isSandboxMarker('app_sandbox_partnerco_happyPath ')).toBe(false);
  });
});
