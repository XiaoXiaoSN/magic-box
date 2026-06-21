import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// converts a 32-bit integer to dotted-quad notation
function intToDotted(n: number): string {
  return [
    (n >>> 24) & 0xff,
    (n >>> 16) & 0xff,
    (n >>> 8) & 0xff,
    n & 0xff,
  ].join('.');
}

// parses an IPv4 CIDR string into { ipInt, prefix } or null if malformed
function parseCIDR(raw: string): { ipInt: number; prefix: number } | null {
  const slashIdx = raw.indexOf('/');
  if (slashIdx === -1) return null;

  const ipPart = raw.slice(0, slashIdx);
  const prefixPart = raw.slice(slashIdx + 1);

  const octets = ipPart.split('.');
  if (octets.length !== 4) return null;

  let ipInt = 0;
  for (const octet of octets) {
    // reject empty, non-numeric, or out-of-range octets
    if (!/^\d{1,3}$/.test(octet)) return null;
    const val = Number.parseInt(octet, 10);
    if (val < 0 || val > 255) return null;
    ipInt = ((ipInt << 8) | val) >>> 0;
  }

  if (!/^\d{1,2}$/.test(prefixPart)) return null;
  const prefix = Number.parseInt(prefixPart, 10);
  if (prefix < 0 || prefix > 32) return null;

  return { ipInt, prefix };
}

// builds a single error box describing an invalid CIDR input
function buildErrorBox(input: string, priority: number): Box {
  // truncate so a huge ?input= can't bloat the error string / DOM
  const shown = input.length > 100 ? `${input.slice(0, 100)}…` : input;
  const msg = `Invalid CIDR notation: "${shown}". Expected format: A.B.C.D/0-32`;
  return new BoxBuilder('Subnet', msg)
    .setTemplate(KeyValueBoxTemplate)
    .setOptions({ Error: msg })
    .setShowExpandButton(false)
    .setPriority(priority)
    .build();
}

export const SubnetBoxSource = {
  name: 'Subnet',
  description: 'IPv4 CIDR subnet calculator. e.g. 192.168.1.10/24 ::subnet.',
  defaultInput: '192.168.1.10/24 ::subnet',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'subnet', 'cidr')) return [];
    // a CIDR is short; bound work before parsing
    if (input.length > 100) return [];

    const raw = trim(input);

    const parsed = parseCIDR(raw);
    if (parsed === null) {
      return [buildErrorBox(raw, this.priority)];
    }

    const { ipInt, prefix } = parsed;

    // mask is all 1s for prefix bits; special-case /0 to avoid undefined shift behavior
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    const network = (ipInt & mask) >>> 0;
    const broadcast = (network | (~mask >>> 0)) >>> 0;

    // total addresses = 2^(32-prefix)
    const total = 2 ** (32 - prefix);

    // usable host count per RFC 3021: /31 = 2, /32 = 1, otherwise total - 2
    let usable: number;
    if (prefix === 32) {
      usable = 1;
    } else if (prefix === 31) {
      usable = 2;
    } else {
      usable = Math.max(0, total - 2);
    }

    // first and last usable hosts
    const firstHost = prefix >= 31 ? network : (network + 1) >>> 0;
    const lastHost = prefix >= 31 ? broadcast : (broadcast - 1) >>> 0;

    const kvOptions: Record<string, string> = {
      CIDR: `${intToDotted(network)}/${prefix}`,
      Netmask: intToDotted(mask),
      Wildcard: intToDotted(~mask >>> 0),
      Network: intToDotted(network),
      Broadcast: intToDotted(broadcast),
      'First Host': intToDotted(firstHost),
      'Last Host': intToDotted(lastHost),
      'Total Addresses': String(total),
      'Usable Hosts': String(usable),
    };

    // render key/value lines for headless/TUI consumers (not raw JSON)
    const plaintext = Object.entries(kvOptions)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    const box = new BoxBuilder('Subnet', plaintext)
      .setTemplate(KeyValueBoxTemplate)
      .setOptions(kvOptions)
      .setShowExpandButton(false)
      .setPriority(this.priority)
      .build();

    return [box];
  },
};

export default SubnetBoxSource;
