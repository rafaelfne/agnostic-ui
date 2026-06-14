import net from 'node:net';

/**
 * Anti-SSRF IP classification (ADR 0003 §5). `isBlockedIp` returns true for any
 * address an integration must never reach: loopback, RFC1918, CGNAT, link-local
 * (incl. the cloud metadata IP 169.254.169.254), ULA, multicast and reserved
 * ranges — across IPv4, IPv6, and IPv4-mapped IPv6. Unparseable input is blocked
 * (fail-closed).
 */

function parseIpv4(ip: string): number | null {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (match === null) return null;
  const octets = match.slice(1).map(Number);
  for (const octet of octets) {
    if (octet > 255) return null;
  }
  const [a = 0, b = 0, c = 0, d = 0] = octets;
  return ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;
}

/** Private/reserved IPv4 blocks (base, prefix). */
const V4_BLOCKED: ReadonlyArray<readonly [string, number]> = [
  ['0.0.0.0', 8], // "this" network
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // CGNAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local (incl. 169.254.169.254 metadata)
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // documentation
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // documentation
  ['203.0.113.0', 24], // documentation
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved (incl. 255.255.255.255)
];

function blockedV4(n: number): boolean {
  return V4_BLOCKED.some(([base, prefix]) => {
    const baseInt = parseIpv4(base) ?? 0;
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    return (n & mask) >>> 0 === (baseInt & mask) >>> 0;
  });
}

/** Expands an IPv6 string (incl. `::` and a trailing embedded IPv4) into 8 groups. */
function expandIpv6(ip: string): number[] | null {
  let addr = ip;
  const zone = addr.indexOf('%');
  if (zone >= 0) addr = addr.slice(0, zone);

  // Trailing embedded IPv4 (e.g. ::ffff:1.2.3.4) → two hex groups.
  if (addr.includes('.')) {
    const lastColon = addr.lastIndexOf(':');
    if (lastColon < 0) return null;
    const v4 = parseIpv4(addr.slice(lastColon + 1));
    if (v4 === null) return null;
    const hi = ((v4 >>> 16) & 0xffff).toString(16);
    const lo = (v4 & 0xffff).toString(16);
    addr = `${addr.slice(0, lastColon)}:${hi}:${lo}`;
  }

  let groups: string[];
  const doubleColon = addr.indexOf('::');
  if (doubleColon >= 0) {
    if (addr.indexOf('::', doubleColon + 1) >= 0) return null; // only one `::`
    const head = addr
      .slice(0, doubleColon)
      .split(':')
      .filter((s) => s !== '');
    const tail = addr
      .slice(doubleColon + 2)
      .split(':')
      .filter((s) => s !== '');
    const missing = 8 - head.length - tail.length;
    if (missing < 1) return null;
    groups = [...head, ...new Array<string>(missing).fill('0'), ...tail];
  } else {
    groups = addr.split(':');
  }

  if (groups.length !== 8) return null;
  const nums = groups.map((g) => parseInt(g, 16));
  if (nums.some((n) => Number.isNaN(n) || n < 0 || n > 0xffff)) return null;
  return nums;
}

function blockedV6(ip: string): boolean {
  const groups = expandIpv6(ip);
  if (groups === null) return true; // unparseable → fail-closed
  const [g0 = 0, g1 = 0, g2 = 0, g3 = 0, g4 = 0, g5 = 0, g6 = 0, g7 = 0] = groups;

  if (groups.every((g) => g === 0)) return true; // :: unspecified
  if (g0 + g1 + g2 + g3 + g4 + g5 + g6 === 0 && g7 === 1) return true; // ::1 loopback

  // v4-mapped (::ffff:0:0/96) and NAT64 (64:ff9b::/96) → classify the embedded v4.
  const embedsV4 =
    (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0xffff) ||
    (g0 === 0x0064 && g1 === 0xff9b && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0);
  if (embedsV4) return blockedV4((((g6 << 16) | g7) >>> 0) >>> 0);

  if ((g0 & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
  if ((g0 & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((g0 & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  if (g0 === 0x2001 && g1 === 0x0db8) return true; // 2001:db8::/32 documentation
  return false;
}

/** True when the IP must never be connected to (private/reserved/loopback/etc.). */
export function isBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const n = parseIpv4(ip);
    return n === null ? true : blockedV4(n);
  }
  if (net.isIPv6(ip)) return blockedV6(ip);
  return true; // not an IP literal → fail-closed
}
