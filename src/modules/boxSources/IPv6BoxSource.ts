import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 20;

// expand :: shorthand into 8 groups of 4 hex digits each
function expandIPv6(address: string): string | null {
  // reject zone IDs and embedded IPv4
  if (address.includes('%') || address.includes('.')) return null;

  const halves = address.split('::');
  if (halves.length > 2) return null;

  let left: string[] = [];
  let right: string[] = [];

  if (halves.length === 2) {
    left = halves[0] ? halves[0].split(':') : [];
    right = halves[1] ? halves[1].split(':') : [];

    const missing = 8 - left.length - right.length;
    if (missing < 0) return null;

    const middle = Array(missing).fill('0000');
    const groups = [...left, ...middle, ...right];

    return validateAndPad(groups);
  }

  // no :: — must be exactly 8 groups
  const groups = address.split(':');
  if (groups.length !== 8) return null;

  return validateAndPad(groups);
}

// validate each group is 1-4 hex digits and pad to 4
function validateAndPad(groups: string[]): string | null {
  if (groups.length !== 8) return null;

  const padded: string[] = [];
  for (const g of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null;
    padded.push(g.toLowerCase().padStart(4, '0'));
  }

  return padded.join(':');
}

// compress per RFC 5952: lowercase, strip leading zeros, replace longest run of ≥2 zero groups with ::
function compressIPv6(expanded: string): string {
  const groups = expanded
    .split(':')
    .map((g) => Number.parseInt(g, 16).toString(16));

  // find the leftmost longest run of consecutive zero groups (length ≥ 2)
  let bestStart = -1;
  let bestLen = 0;
  let runStart = -1;
  let runLen = 0;

  for (let i = 0; i < groups.length; i++) {
    if (groups[i] === '0') {
      if (runStart === -1) {
        runStart = i;
        runLen = 1;
      } else {
        runLen++;
      }
      if (runLen > bestLen) {
        bestLen = runLen;
        bestStart = runStart;
      }
    } else {
      runStart = -1;
      runLen = 0;
    }
  }

  // only collapse if the run is at least 2 consecutive zero groups
  if (bestLen >= 2) {
    const before = groups.slice(0, bestStart);
    const after = groups.slice(bestStart + bestLen);
    return `${before.join(':')}::${after.join(':')}`;
  }

  return groups.join(':');
}

export const IPv6BoxSource = {
  name: 'IPv6',
  description: 'Expand and compress an IPv6 address.',
  defaultInput: '2001:db8::1 ::ipv6',
  tag: '#',
  kind: 'Network',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'ipv6')) return [];

    const raw = trim(input);
    const expanded = expandIPv6(raw);
    if (expanded === null) return [];

    const compressed = compressIPv6(expanded);

    const output: Record<string, string> = {
      Expanded: expanded,
      Compressed: compressed,
    };

    const plaintextOutput = Object.entries(output)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('IPv6', plaintextOutput)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(output)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default IPv6BoxSource;
