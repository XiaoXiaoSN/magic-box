const MAX_IPV6_INPUT_LENGTH = 100;
const MAX_ZONE_LENGTH = 32;
const MAX_IPV6_VALUE = (1n << 128n) - 1n;

export interface ParsedIPv6Address {
  groups: readonly number[];
  value: bigint;
  prefix: number | null;
  network: bigint;
  last: bigint;
  count: bigint;
  zone: string | null;
  expanded: string;
  compressed: string;
}

export type IPv6ParseResult =
  | { ok: true; address: ParsedIPv6Address }
  | { ok: false; error: string };

export interface FormattedIPv6Address {
  expanded: string;
  compressed: string;
}

function failure(error: string): IPv6ParseResult {
  return { ok: false, error };
}

function parsePrefix(raw: string): number | null {
  if (!/^(?:0|[1-9]\d{0,2})$/.test(raw)) return null;
  const prefix = Number.parseInt(raw, 10);
  return prefix <= 128 ? prefix : null;
}

function parseIPv4(raw: string): number[] | null {
  const octets = raw.split('.');
  if (octets.length !== 4) return null;

  const values: number[] = [];
  for (const octet of octets) {
    if (!/^\d{1,3}$/.test(octet)) return null;
    const value = Number.parseInt(octet, 10);
    if (value > 255) return null;
    values.push(value);
  }

  return [(values[0] << 8) | values[1], (values[2] << 8) | values[3]];
}

function parseHextets(raw: string): number[] | null {
  if (raw.includes('.')) return parseIPv4(raw);
  if (!/^[0-9a-fA-F]{1,4}$/.test(raw)) return null;
  return [Number.parseInt(raw, 16)];
}

function parseGroupList(raw: string): number[] | null {
  if (raw === '') return [];

  const parts = raw.split(':');
  const groups: number[] = [];
  for (let index = 0; index < parts.length; index += 1) {
    const parsed = parseHextets(parts[index]);
    if (
      parsed === null ||
      (parsed.length === 2 && index !== parts.length - 1)
    ) {
      return null;
    }
    groups.push(...parsed);
  }
  return groups;
}

function parseGroups(raw: string): number[] | null {
  const ipv4Parts = raw.split(':').filter((part) => part.includes('.'));
  if (
    ipv4Parts.length > 0 &&
    (ipv4Parts.length !== 1 || !raw.endsWith(ipv4Parts[0]))
  ) {
    return null;
  }

  const compression = raw.indexOf('::');
  if (compression !== -1) {
    if (raw.indexOf('::', compression + 2) !== -1) return null;

    const left = parseGroupList(raw.slice(0, compression));
    const right = parseGroupList(raw.slice(compression + 2));
    if (left === null || right === null) return null;

    const missing = 8 - left.length - right.length;
    if (missing < 1) return null;
    return [...left, ...Array<number>(missing).fill(0), ...right];
  }

  const groups = parseGroupList(raw);
  return groups?.length === 8 ? groups : null;
}

function groupsToValue(groups: readonly number[]): bigint {
  let value = 0n;
  for (const group of groups) value = (value << 16n) | BigInt(group);
  return value;
}

function groupsToExpanded(groups: readonly number[]): string {
  return groups.map((group) => group.toString(16).padStart(4, '0')).join(':');
}

function groupsToCompressed(groups: readonly number[]): string {
  let bestStart = -1;
  let bestLength = 0;
  let runStart = -1;
  let runLength = 0;

  for (let index = 0; index < groups.length; index += 1) {
    if (groups[index] === 0) {
      if (runStart === -1) runStart = index;
      runLength += 1;
      if (runLength > bestLength) {
        bestStart = runStart;
        bestLength = runLength;
      }
    } else {
      runStart = -1;
      runLength = 0;
    }
  }

  if (bestLength < 2) {
    return groups.map((group) => group.toString(16)).join(':');
  }

  const left = groups
    .slice(0, bestStart)
    .map((group) => group.toString(16))
    .join(':');
  const right = groups
    .slice(bestStart + bestLength)
    .map((group) => group.toString(16))
    .join(':');
  if (left === '' && right === '') return '::';
  if (left === '') return `::${right}`;
  if (right === '') return `${left}::`;
  return `${left}::${right}`;
}

function valueToGroups(value: bigint): number[] {
  const groups = Array<number>(8);
  let remaining = value;
  for (let index = 7; index >= 0; index -= 1) {
    groups[index] = Number(remaining & 0xffffn);
    remaining >>= 16n;
  }
  return groups;
}

export function formatIPv6Address(value: bigint): FormattedIPv6Address {
  if (value < 0n || value > MAX_IPV6_VALUE) {
    throw new RangeError('IPv6 value is outside the 128-bit range');
  }
  const groups = valueToGroups(value);
  return {
    expanded: groupsToExpanded(groups),
    compressed: groupsToCompressed(groups),
  };
}

/** parses a bounded IPv6 literal and derives its optional CIDR range. */
export function parseIPv6Address(raw: string): IPv6ParseResult {
  if (raw.length === 0 || raw.length > MAX_IPV6_INPUT_LENGTH) {
    return failure('IPv6 input is empty or too long');
  }

  let addressPart = raw;
  let prefixPart: string | null = null;
  if (raw.startsWith('[')) {
    const closing = raw.indexOf(']');
    if (closing < 0 || raw.indexOf(']', closing + 1) !== -1) {
      return failure('invalid brackets');
    }
    addressPart = raw.slice(1, closing);
    const suffix = raw.slice(closing + 1);
    if (suffix !== '') {
      if (!suffix.startsWith('/') || suffix.indexOf('/', 1) !== -1) {
        return failure('invalid CIDR suffix');
      }
      prefixPart = suffix.slice(1);
    }
  } else {
    if (raw.includes('[') || raw.includes(']'))
      return failure('invalid brackets');
    const slash = raw.indexOf('/');
    if (slash !== -1) {
      if (raw.indexOf('/', slash + 1) !== -1)
        return failure('invalid CIDR suffix');
      addressPart = raw.slice(0, slash);
      prefixPart = raw.slice(slash + 1);
    }
  }

  const prefix = prefixPart === null ? null : parsePrefix(prefixPart);
  if (prefixPart !== null && prefix === null) {
    return failure('CIDR prefix must be between 0 and 128');
  }

  let zone: string | null = null;
  const zoneStart = addressPart.indexOf('%');
  if (zoneStart !== -1) {
    if (addressPart.indexOf('%', zoneStart + 1) !== -1) {
      return failure('invalid zone');
    }
    zone = addressPart.slice(zoneStart + 1);
    if (
      zone.length === 0 ||
      zone.length > MAX_ZONE_LENGTH ||
      !/^[A-Za-z0-9_.~-]+$/.test(zone)
    ) {
      return failure('invalid zone');
    }
    addressPart = addressPart.slice(0, zoneStart);
  }

  const groups = parseGroups(addressPart);
  if (groups === null) return failure('invalid IPv6 groups');

  const value = groupsToValue(groups);
  const hostBits = prefix === null ? 0 : 128 - prefix;
  const count = 1n << BigInt(hostBits);
  const hostMask = count - 1n;
  const network = value & (MAX_IPV6_VALUE ^ hostMask);
  const last = network | hostMask;
  const formatted = formatIPv6Address(value);

  return {
    ok: true,
    address: {
      groups,
      value,
      prefix,
      network,
      last,
      count,
      zone,
      expanded: formatted.expanded,
      compressed: formatted.compressed,
    },
  };
}
