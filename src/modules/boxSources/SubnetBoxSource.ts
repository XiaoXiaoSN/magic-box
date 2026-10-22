import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const MAX_INPUT_LENGTH = 100;
const MAX_SPLIT_SUBNETS = 1024;

interface ParsedNetwork {
  address: number;
  prefix: number;
}

function intToDotted(value: number): string {
  return [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ].join('.');
}

function parseIpv4(raw: string): number | null {
  const octets = raw.split('.');
  if (octets.length !== 4) return null;

  let value = 0;
  for (const octet of octets) {
    if (!/^(?:0|[1-9]\d{0,2})$/.test(octet)) return null;
    const parsed = Number(octet);
    if (parsed > 255) return null;
    value = value * 256 + parsed;
  }
  return value;
}

function parsePrefix(raw: string): number | null {
  if (!/^(?:0|[1-9]|[12]\d|3[0-2])$/.test(raw)) return null;
  return Number(raw);
}

function prefixFromMask(mask: number): number | null {
  let prefix = 0;
  let foundZero = false;
  for (let bit = 31; bit >= 0; bit -= 1) {
    const isOne = ((mask >>> bit) & 1) === 1;
    if (!isOne) {
      foundZero = true;
    } else {
      if (foundZero) return null;
      prefix += 1;
    }
  }
  return prefix;
}

function parseNetwork(raw: string): ParsedNetwork | null {
  const cidr = /^(\S+)\/(\S+)$/.exec(raw);
  if (cidr !== null) {
    const address = parseIpv4(cidr[1]);
    const prefix = parsePrefix(cidr[2]);
    return address === null || prefix === null ? null : { address, prefix };
  }

  const netmask = /^(\S+)\s+(\S+)$/.exec(raw);
  if (netmask === null) return null;
  const address = parseIpv4(netmask[1]);
  const mask = parseIpv4(netmask[2]);
  if (address === null || mask === null) return null;
  const prefix = prefixFromMask(mask);
  return prefix === null ? null : { address, prefix };
}

function parseSplit(options: BoxOptions): number | null {
  const value = extractOptionKeys(options, 'split');
  if (value === null) return 1;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;

  const count = Number(value);
  if (
    !Number.isSafeInteger(count) ||
    count < 1 ||
    count > MAX_SPLIT_SUBNETS ||
    (count & (count - 1)) !== 0
  ) {
    return null;
  }
  return count;
}

function buildErrorBox(input: string): Box {
  const shown =
    input.length > MAX_INPUT_LENGTH
      ? `${input.slice(0, MAX_INPUT_LENGTH)}…`
      : input;
  const message = `Invalid CIDR or subnet notation: "${shown}".`;
  return new BoxBuilder('Subnet', message)
    .setView('keyValue')
    .setOptions({ Error: message })
    .setShowExpandButton(false)

    .build();
}

export const SubnetBoxSource = {
  defaultDisabled: true,
  name: 'Subnet',
  description:
    'Calculate IPv4 CIDR or IP/netmask subnets, split a network, and test membership with ::subnet.',
  defaultInput: '192.168.1.10/24\n::subnet',
  tag: '#',
  kind: 'Analyze',

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'subnet', 'cidr', 'split', 'contains')) {
      return [];
    }
    if (input.length > MAX_INPUT_LENGTH) return [];

    const subnetOption = extractOptionKeys(options, 'subnet', 'cidr');
    const raw = trim(
      typeof subnetOption === 'string' && subnetOption.trim() !== ''
        ? subnetOption
        : input,
    );
    const parsed = parseNetwork(raw);
    if (parsed === null) return [buildErrorBox(raw)];

    const split = parseSplit(options);
    if (split === null) {
      return [buildErrorBox('split must be a power of two up to 1024')];
    }

    const childPrefix = parsed.prefix + Math.log2(split);
    if (childPrefix > 32) {
      return [buildErrorBox('split exceeds the IPv4 prefix limit')];
    }

    const mask =
      parsed.prefix === 0 ? 0 : (0xffffffff << (32 - parsed.prefix)) >>> 0;
    const network = (parsed.address & mask) >>> 0;
    const broadcast = (network | (~mask >>> 0)) >>> 0;
    const total = 2 ** (32 - parsed.prefix);
    const usable =
      parsed.prefix === 32
        ? 1
        : parsed.prefix === 31
          ? 2
          : Math.max(0, total - 2);
    const firstHost = parsed.prefix >= 31 ? network : (network + 1) >>> 0;
    const lastHost = parsed.prefix >= 31 ? broadcast : (broadcast - 1) >>> 0;

    const values: Record<string, string> = {
      CIDR: `${intToDotted(network)}/${parsed.prefix}`,
      Netmask: intToDotted(mask),
      Wildcard: intToDotted(~mask >>> 0),
      Network: intToDotted(network),
      Broadcast: intToDotted(broadcast),
      'First Host': intToDotted(firstHost),
      'Last Host': intToDotted(lastHost),
      'Total Addresses': String(total),
      'Usable Hosts': String(usable),
    };

    const contains = extractOptionKeys(options, 'contains');
    if (contains !== null) {
      if (typeof contains !== 'string') {
        return [buildErrorBox('contains requires an IPv4 address')];
      }
      const candidate = parseIpv4(contains.trim());
      if (candidate === null) {
        return [buildErrorBox('contains requires an IPv4 address')];
      }
      values.Contains = String(candidate >= network && candidate <= broadcast);
    }

    if (hasOptionKeys(options, 'split')) {
      const childSize = 2 ** (32 - childPrefix);
      const subnets = Array.from({ length: split }, (_, index) => {
        const childNetwork = (network + index * childSize) >>> 0;
        return `${intToDotted(childNetwork)}/${childPrefix}`;
      });
      values.Split = String(split);
      values.Subnets = subnets.join(', ');
    }

    const plaintext = Object.entries(values)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    return [
      new BoxBuilder('Subnet', plaintext)
        .setView('keyValue')
        .setOptions(values)
        .setShowExpandButton(false)

        .build(),
    ];
  },
};

export default SubnetBoxSource;
