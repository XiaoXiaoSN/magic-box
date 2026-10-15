import { trim } from '@functions/helper';
import { formatIPv6Address, parseIPv6Address } from '@functions/parseIPv6';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;

const MAX_INPUT_LENGTH = 100;

function kvToPlaintext(pairs: Record<string, string>): string {
  return Object.entries(pairs)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

function invalidIPv6Box(raw: string, error: string, priority: number): Box[] {
  const shown =
    raw.length > MAX_INPUT_LENGTH ? `${raw.slice(0, MAX_INPUT_LENGTH)}…` : raw;
  const kv = {
    Input: shown,
    Error: `Not a valid IPv6 address: ${error}`,
  };
  return [
    new BoxBuilder('IPv6', kvToPlaintext(kv))
      .setOptions(kv)
      .setView('keyValue')
      .setPriority(priority)
      .build(),
  ];
}

export const Ipv6BoxSource = {
  defaultDisabled: true,
  name: 'IPv6',
  description: 'Expand and compress an IPv6 address (RFC 5952).',
  defaultInput: '2001:db8::1\n::ipv6',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'ipv6')) return [];

    const selected = extractOptionKeys(options, 'ipv6');
    const raw = trim(typeof selected === 'string' ? selected : input);
    if (!raw) return [];
    if (raw.length > MAX_INPUT_LENGTH && typeof selected !== 'string')
      return [];

    const result = parseIPv6Address(raw);
    if (!result.ok) {
      // return an explanatory box instead of silently dropping.
      return invalidIPv6Box(raw, result.error, this.priority);
    }

    const { address } = result;

    const kv: Record<string, string> = {
      Input: raw,
      Expanded: address.expanded,
      Compressed: address.compressed,
    };

    if (address.zone !== null) kv.Zone = address.zone;
    if (address.prefix !== null) {
      const network = formatIPv6Address(address.network).compressed;
      const last = formatIPv6Address(address.last).compressed;
      kv.Prefix = String(address.prefix);
      kv.Network = `${network}/${address.prefix}`;
      kv.Last = last;
      kv.Count = address.count.toString();
    }

    return [
      new BoxBuilder('IPv6', kvToPlaintext(kv))
        .setOptions(kv)
        .setView('keyValue')
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default Ipv6BoxSource;
