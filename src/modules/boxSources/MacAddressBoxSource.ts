import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// extracts raw hex from colon, hyphen, cisco-dot, or bare formats
function parseHex(input: string): string | null {
  const raw = trim(input).replace(/[:\-.]/g, '');
  if (!/^[0-9a-fA-F]{12}$/.test(raw)) return null;
  return raw.toLowerCase();
}

// determines unicast/multicast and universal/local from the first octet
function macType(hex: string): string {
  const firstOctet = Number.parseInt(hex.slice(0, 2), 16);
  const multicast = (firstOctet & 0x01) === 1 ? 'multicast' : 'unicast';
  const local = (firstOctet & 0x02) === 2 ? 'local' : 'universal';
  return `${multicast}, ${local}`;
}

export const MacAddressBoxSource = {
  name: 'MAC Address',
  description:
    'Validate a MAC address and show it in colon, hyphen, dot, and bare formats.',
  defaultInput: '00:1B:44:11:3A:B7 ::mac',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'mac', 'macaddress')) return [];

    const hex = parseHex(input);
    if (!hex) return [];

    // build the four canonical representations
    const octets = hex.match(/.{2}/g) as string[];
    const colon = octets.join(':');
    const hyphen = octets.join('-');
    const dot = `${hex.slice(0, 4)}.${hex.slice(4, 8)}.${hex.slice(8, 12)}`;
    const bare = hex;
    const type = macType(hex);

    const kvOptions: Record<string, string> = {
      Colon: colon,
      Hyphen: hyphen,
      Dot: dot,
      Bare: bare,
      Type: type,
    };

    const lines = Object.entries(kvOptions)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('MAC Address', lines)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kvOptions)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default MacAddressBoxSource;
