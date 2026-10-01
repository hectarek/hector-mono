import { BlockList, isIP } from "node:net";

// Addresses a fetched page may never be on (ux-plan P10.3): this machine, private and
// carrier networks, link-local (cloud metadata lives at 169.254.169.254), multicast, and
// the ranges kept for documentation or other uses. IPv4 mapped into IPv6 (::ffff:a.b.c.d) is
// checked as IPv4; the older ways of writing IPv4 inside IPv6 are refused outright, as no
// recipe site uses them.
const NOT_PUBLIC = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  NOT_PUBLIC.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  // IPv4-compatible (::a.b.c.d), which covers :: and ::1 too.
  ["::", 96],
  // IPv4-translated (::ffff:0:a.b.c.d), NAT64 and 6to4.
  ["::ffff:0:0:0", 96],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["2002::", 16],
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["fec0::", 10],
  ["ff00::", 8],
] as const) {
  NOT_PUBLIC.addSubnet(network, prefix, "ipv6");
}

export function isPublicAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 0) return false;
  return !NOT_PUBLIC.check(address, version === 6 ? "ipv6" : "ipv4");
}
