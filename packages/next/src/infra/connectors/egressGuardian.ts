import net from 'node:net';
import { lookup } from 'node:dns/promises';

import { isBlockedIp } from './ip';

export type EgressErrorCode =
  | 'invalid_url'
  | 'scheme_blocked'
  | 'host_not_allowlisted'
  | 'dns_no_records'
  | 'ip_blocked';

/** Raised when an outbound request is refused. Carries a stable `code` for logs/host mapping. */
export class EgressError extends Error {
  readonly code: EgressErrorCode;

  constructor(code: EgressErrorCode, message: string) {
    super(`egress_blocked:${code}: ${message}`);
    this.name = 'EgressError';
    this.code = code;
  }
}

export interface EgressPolicy {
  /** Exact hostnames an integration may reach. */
  allowlist: readonly string[];
  /** Allow plain http (default false — https only). */
  allowHttp?: boolean;
}

/** Resolves a hostname to every A/AAAA address (injectable for tests). */
export type DnsLookup = (host: string) => Promise<string[]>;

export const dnsLookupAll: DnsLookup = async (host) => {
  const records = await lookup(host, { all: true });
  return records.map((record) => record.address);
};

/**
 * Fail-closed egress check (ADR 0003 §5): https-only (unless opted in), host on the
 * allowlist, and **every** resolved IP public — rejecting loopback/private/link-local
 * (incl. the metadata IP). Resolving all records and checking each mitigates DNS
 * rebinding; a residual TOCTOU gap remains between check and connect, so callers
 * also disable redirects and re-check each hop. Returns the parsed URL when allowed.
 */
export async function assertEgressAllowed(
  rawUrl: string,
  policy: EgressPolicy,
  deps: { lookup: DnsLookup } = { lookup: dnsLookupAll },
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new EgressError('invalid_url', rawUrl);
  }

  if (url.protocol === 'http:') {
    if (policy.allowHttp !== true) throw new EgressError('scheme_blocked', url.protocol);
  } else if (url.protocol !== 'https:') {
    throw new EgressError('scheme_blocked', url.protocol);
  }

  const host = url.hostname;
  if (!policy.allowlist.includes(host)) {
    throw new EgressError('host_not_allowlisted', host);
  }

  const ips = net.isIP(host) !== 0 ? [host] : await deps.lookup(host);
  if (ips.length === 0) throw new EgressError('dns_no_records', host);
  for (const ip of ips) {
    if (isBlockedIp(ip)) throw new EgressError('ip_blocked', `${host} -> ${ip}`);
  }

  return url;
}
