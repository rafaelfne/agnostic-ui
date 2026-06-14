import { describe, expect, it } from 'vitest';

import { isBlockedIp } from '../infra/connectors/ip';

describe('isBlockedIp — IPv4', () => {
  it.each([
    '0.0.0.0',
    '10.0.0.1',
    '10.255.255.255',
    '100.64.0.1', // CGNAT
    '127.0.0.1',
    '127.5.5.5',
    '169.254.0.1',
    '169.254.169.254', // cloud metadata
    '172.16.0.1',
    '172.31.255.255',
    '192.168.0.1',
    '198.18.0.1',
    '224.0.0.1', // multicast
    '255.255.255.255',
  ])('blocks private/reserved %s', (ip) => {
    expect(isBlockedIp(ip)).toBe(true);
  });

  it.each([
    '8.8.8.8',
    '1.1.1.1',
    '93.184.216.34',
    '172.32.0.1', // just outside 172.16/12
    '11.0.0.1',
  ])('allows public %s', (ip) => {
    expect(isBlockedIp(ip)).toBe(false);
  });
});

describe('isBlockedIp — IPv6', () => {
  it.each([
    '::1', // loopback
    '::', // unspecified
    'fe80::1', // link-local
    'fc00::1', // ULA
    'fd12:3456::1', // ULA
    'ff02::1', // multicast
    '2001:db8::1', // documentation
    '::ffff:127.0.0.1', // v4-mapped loopback
    '::ffff:169.254.169.254', // v4-mapped metadata
    '::ffff:10.0.0.1', // v4-mapped private
    '64:ff9b::127.0.0.1', // NAT64 over loopback
  ])('blocks reserved %s', (ip) => {
    expect(isBlockedIp(ip)).toBe(true);
  });

  it.each([
    '2606:4700:4700::1111', // Cloudflare DNS
    '2001:4860:4860::8888', // Google DNS
    '::ffff:8.8.8.8', // v4-mapped public
  ])('allows public %s', (ip) => {
    expect(isBlockedIp(ip)).toBe(false);
  });
});

describe('isBlockedIp — non-IP', () => {
  it.each(['not-an-ip', '', 'example.com', '999.999.999.999', '10.0.0'])(
    'blocks non-IP input %s (fail-closed)',
    (value) => {
      expect(isBlockedIp(value)).toBe(true);
    },
  );
});
