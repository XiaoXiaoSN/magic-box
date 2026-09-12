import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// max input length to avoid pathological parsing
const MAX_INPUT_LENGTH = 100;

// pattern for a single hextet (1-4 hex digits)
const HEXTET_RE = /^[0-9a-fA-F]{1,4}$/;

// pattern for an embedded IPv4 address (reject for simplicity)
const IPV4_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

function kvToPlaintext(pairs: Record<string, string>): string {
  return Object.entries(pairs)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

interface ParseResult {
  groups: number[]; // 8 groups as numbers (0-65535)
}

// parse an IPv6 address string into 8 numeric groups, or return an error string
function parseIPv6(raw: string): ParseResult | string {
  const addr = raw.toLowerCase();

  // count '::' occurrences — RFC 5952 allows at most one
  const doubleColonCount = (addr.match(/::/g) ?? []).length;
  if (doubleColonCount > 1) {
    return 'double "::" found more than once';
  }

  let left: string[];
  let right: string[];

  if (doubleColonCount === 1) {
    const parts = addr.split('::');
    left = parts[0] ? parts[0].split(':') : [];
    right = parts[1] ? parts[1].split(':') : [];
  } else {
    left = addr.split(':');
    right = [];
  }

  // check for embedded IPv4 in the rightmost group
  if (right.length > 0 && IPV4_RE.test(right[right.length - 1])) {
    return 'embedded IPv4 addresses are not supported';
  }

  const allGroups = [...left, ...right];

  // validate each hextet
  for (const group of allGroups) {
    if (!HEXTET_RE.test(group)) {
      return `invalid hextet: "${group}"`;
    }
  }

  const totalExplicit = left.length + right.length;

  if (doubleColonCount === 1) {
    // '::' fills the remaining zero groups
    const zeroCount = 8 - totalExplicit;
    if (zeroCount < 1) {
      return 'too many groups for a valid IPv6 address with "::"';
    }
    const groups: number[] = [
      ...left.map((h) => Number.parseInt(h, 16)),
      ...Array(zeroCount).fill(0),
      ...right.map((h) => Number.parseInt(h, 16)),
    ];
    return { groups };
  }

  // no '::' — must be exactly 8 groups
  if (totalExplicit !== 8) {
    return `expected 8 groups, got ${totalExplicit}`;
  }

  return {
    groups: left.map((h) => Number.parseInt(h, 16)),
  };
}

// produce the full expanded form: 8 groups, each 4 lowercase hex digits
function expand(groups: number[]): string {
  return groups.map((g) => g.toString(16).padStart(4, '0')).join(':');
}

// produce the RFC 5952 compressed form:
// - drop leading zeros per group
// - replace the longest run of consecutive all-zero groups (>=2) with '::'
//   (leftmost run wins on tie)
function compress(groups: number[]): string {
  // find the longest run of zeros (length >= 2), leftmost on tie
  let bestStart = -1;
  let bestLen = 0;
  let runStart = -1;
  let runLen = 0;

  for (let i = 0; i < 8; i++) {
    if (groups[i] === 0) {
      if (runStart === -1) {
        runStart = i;
        runLen = 1;
      } else {
        runLen++;
      }
      // update best only when strictly longer (leftmost on tie)
      if (runLen > bestLen) {
        bestLen = runLen;
        bestStart = runStart;
      }
    } else {
      runStart = -1;
      runLen = 0;
    }
  }

  // RFC 5952: only compress if the run is >= 2 consecutive zero groups
  if (bestLen < 2) {
    return groups.map((g) => g.toString(16)).join(':');
  }

  const before = groups.slice(0, bestStart).map((g) => g.toString(16));
  const after = groups.slice(bestStart + bestLen).map((g) => g.toString(16));

  const left = before.join(':');
  const right = after.join(':');

  if (left === '' && right === '') return '::';
  if (left === '') return `::${right}`;
  if (right === '') return `${left}::`;
  return `${left}::${right}`;
}

export const Ipv6BoxSource = {
  defaultDisabled: true,
  name: 'IPv6',
  description: 'Expand and compress an IPv6 address (RFC 5952).',
  defaultInput: '2001:db8::1 ::ipv6',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'ipv6')) return [];

    const raw = trim(input);
    if (!raw || raw.length > MAX_INPUT_LENGTH) return [];

    const result = parseIPv6(raw);

    if (typeof result === 'string') {
      // return an explanatory box instead of silently dropping
      const kv = { Input: raw, Error: `Not a valid IPv6 address: ${result}` };
      return [
        new BoxBuilder('IPv6', kvToPlaintext(kv))
          .setOptions(kv)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const { groups } = result;
    const expanded = expand(groups);
    const compressed = compress(groups);

    const kv: Record<string, string> = {
      Input: raw,
      Expanded: expanded,
      Compressed: compressed,
    };

    return [
      new BoxBuilder('IPv6', kvToPlaintext(kv))
        .setOptions(kv)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default Ipv6BoxSource;
