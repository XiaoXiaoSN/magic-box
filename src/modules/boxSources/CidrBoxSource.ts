import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box } from '@modules/Box';
import { BoxBuilder } from '@modules/Box';

const Priority = 20;

// converts a 32-bit unsigned integer to dotted-quad notation
function toIPv4(n: number): string {
  return `${(n >>> 24) & 0xff}.${(n >>> 16) & 0xff}.${(n >>> 8) & 0xff}.${n & 0xff}`;
}

interface CidrMatch {
  network: number;
  broadcast: number;
  netmask: number;
  wildcard: number;
  firstHost: number;
  lastHost: number;
  total: number;
  usable: number;
}

const CIDR_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/;

function parseCidr(raw: string): CidrMatch | null {
  const m = CIDR_REGEX.exec(raw);
  if (!m) return null;

  const octets = [m[1], m[2], m[3], m[4]].map((s) => Number.parseInt(s, 10));
  const prefix = Number.parseInt(m[5], 10);

  if (octets.some((o) => o > 255) || prefix > 32) return null;

  const ip = (((octets[0] << 24) |
    (octets[1] << 16) |
    (octets[2] << 8) |
    octets[3]) >>>
    0) as number;

  // left-shift by 0 is identity; handle prefix 0 explicitly to avoid UB on 32-bit shift
  const netmask = (prefix === 0 ? 0 : 0xffffffff << (32 - prefix)) >>> 0;
  const wildcard = ~netmask >>> 0;
  const network = (ip & netmask) >>> 0;
  const broadcast = (network | wildcard) >>> 0;
  const total = prefix === 32 ? 1 : 2 ** (32 - prefix);

  let firstHost: number;
  let lastHost: number;
  let usable: number;

  if (prefix === 32) {
    firstHost = network;
    lastHost = network;
    usable = 1;
  } else if (prefix === 31) {
    // point-to-point: both addresses are usable
    firstHost = network;
    lastHost = broadcast;
    usable = 2;
  } else {
    firstHost = (network + 1) >>> 0;
    lastHost = (broadcast - 1) >>> 0;
    usable = total - 2;
  }

  return {
    network,
    broadcast,
    netmask,
    wildcard,
    firstHost,
    lastHost,
    total,
    usable,
  };
}

export const CidrBoxSource = {
  name: 'CIDR',
  description:
    'Calculate IPv4 subnet details from a CIDR block (e.g. 192.168.1.0/24).',
  defaultInput: '192.168.1.0/24',
  tag: '#',
  kind: 'Network',
  priority: Priority,

  async generateBoxes(input: string): Promise<Box[]> {
    const match = parseCidr(trim(input));
    if (!match) return [];

    const {
      network,
      broadcast,
      netmask,
      wildcard,
      firstHost,
      lastHost,
      total,
      usable,
    } = match;

    const options: Record<string, string> = {
      Network: toIPv4(network),
      Broadcast: toIPv4(broadcast),
      Netmask: toIPv4(netmask),
      Wildcard: toIPv4(wildcard),
      'First Host': toIPv4(firstHost),
      'Last Host': toIPv4(lastHost),
      'Total Addresses': String(total),
      'Usable Hosts': String(usable),
    };

    return [
      new BoxBuilder('CIDR', '')
        .setOptions(options)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default CidrBoxSource;
