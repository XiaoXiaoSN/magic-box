import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// converts a dotted IPv4 string to an unsigned 32-bit integer, or null if invalid
function ipToUint32(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;

  let result = 0;
  for (const part of parts) {
    const octet = Number.parseInt(part, 10);
    if (
      Number.isNaN(octet) ||
      octet < 0 ||
      octet > 255 ||
      part.trim() !== String(octet)
    ) {
      return null;
    }
    result = ((result << 8) | octet) >>> 0;
  }
  return result;
}

// converts an unsigned 32-bit integer to dotted IPv4 notation
function uint32ToIp(n: number): string {
  return [
    (n >>> 24) & 0xff,
    (n >>> 16) & 0xff,
    (n >>> 8) & 0xff,
    n & 0xff,
  ].join('.');
}

interface ParsedCidr {
  cidrInt: number;
  prefix: number;
  mask: number;
  network: number;
  broadcast: number;
}

// parses a CIDR string "A.B.C.D/P" and derives mask, network, and broadcast
function parseCidr(cidr: string): ParsedCidr | null {
  const slashIdx = cidr.lastIndexOf('/');
  if (slashIdx === -1) return null;

  const ipPart = cidr.slice(0, slashIdx);
  const prefixPart = cidr.slice(slashIdx + 1);
  const prefix = Number.parseInt(prefixPart, 10);

  if (
    Number.isNaN(prefix) ||
    prefix < 0 ||
    prefix > 32 ||
    prefixPart.trim() !== String(prefix)
  ) {
    return null;
  }

  const cidrInt = ipToUint32(ipPart);
  if (cidrInt === null) return null;

  // a /0 mask is all zeros; otherwise shift and zero-extend to uint32
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = (cidrInt & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;

  return { cidrInt, prefix, mask, network, broadcast };
}

export const IpInCidrBoxSource = {
  name: 'IP in CIDR',
  description:
    'Check whether an IPv4 address is within a CIDR range. e.g. 10.0.0.5 ::ipincidr=10.0.0.0/24',
  defaultInput: '10.0.0.5 ::ipincidr=10.0.0.0/24',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'ipincidr', 'incidr')) return [];

    const cidrRaw = extractOptionKeys(options, 'ipincidr', 'incidr');
    const ipStr = trim(input);

    // validate both ip and cidr before computing
    const ipInt = ipToUint32(ipStr);
    const parsed = typeof cidrRaw === 'string' ? parseCidr(cidrRaw) : null;

    if (ipInt === null || parsed === null) {
      const reason =
        ipInt === null && parsed === null
          ? 'Invalid IPv4 address and CIDR.'
          : ipInt === null
            ? 'Invalid IPv4 address. Expected format: A.B.C.D (each octet 0-255).'
            : 'Invalid CIDR. Expected format: A.B.C.D/P (prefix 0-32).';

      return [
        new BoxBuilder('IP in CIDR', reason)
          .setOptions({ Error: reason })
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const { prefix, mask, network, broadcast } = parsed;
    const inRange = (ipInt & mask) >>> 0 === network;

    const kvOptions: Record<string, string> = {
      IP: ipStr,
      // show the canonical network/prefix form, not the raw input
      CIDR: `${uint32ToIp(network)}/${prefix}`,
      Network: uint32ToIp(network),
      Broadcast: uint32ToIp(broadcast),
      'In Range': String(inRange),
    };

    // plaintext k:v for headless/TUI consumers
    const plaintextOutput = Object.entries(kvOptions)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('IP in CIDR', plaintextOutput)
        .setOptions(kvOptions)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default IpInCidrBoxSource;
