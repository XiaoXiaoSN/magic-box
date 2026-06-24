import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// size thresholds (in bytes) for which we emit integer interpretations
const WORD_SIZES = new Set([2, 4, 8]);

/** build a `key: value` plaintext string from an ordered entries list */
function kvToPlaintext(entries: [string, string][]): string {
  return entries.map(([k, v]) => `${k}: ${v}`).join('\n');
}

/** swap byte order of a lowercase hex string that has an even number of digits */
function swapBytes(hex: string): string {
  const bytes: string[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(hex.slice(i, i + 2));
  }
  return bytes.reverse().join('');
}

export const ByteSwapBoxSource = {
  defaultDisabled: true,
  name: 'Byte Swap',
  description:
    'Swap the byte order (endianness) of a hex value. ::byteswap or ::endian.',
  defaultInput: '0x12345678 ::byteswap',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'byteswap', 'endian')) return [];

    if (input.length > MAX_INPUT) return [];

    const raw = trim(input);

    // strip optional 0x / 0X prefix
    const stripped =
      raw.startsWith('0x') || raw.startsWith('0X') ? raw.slice(2) : raw;

    const hex = stripped.toLowerCase();

    // validate: must be pure hex digits
    if (!/^[0-9a-f]+$/.test(hex)) {
      const entries: [string, string][] = [
        ['Error', 'Input must be a valid hex value (digits 0-9 and a-f).'],
      ];
      return [
        new BoxBuilder('Byte Swap', kvToPlaintext(entries))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(Object.fromEntries(entries))
          .setPriority(this.priority)
          .build(),
      ];
    }

    // must have an even number of digits to represent whole bytes
    if (hex.length % 2 !== 0) {
      const entries: [string, string][] = [
        [
          'Error',
          'A hex value with an even number of digits is required (each byte is 2 hex digits).',
        ],
      ];
      return [
        new BoxBuilder('Byte Swap', kvToPlaintext(entries))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(Object.fromEntries(entries))
          .setPriority(this.priority)
          .build(),
      ];
    }

    const swapped = swapBytes(hex);
    const byteCount = hex.length / 2;

    const entries: [string, string][] = [
      ['Input', `0x${hex}`],
      ['Swapped', `0x${swapped}`],
      ['Bytes', String(byteCount)],
    ];

    // for 2, 4, or 8-byte values add big-endian / little-endian decimal views
    if (WORD_SIZES.has(byteCount)) {
      // interpret the original bytes as big-endian unsigned integer
      const beValue = BigInt(`0x${hex}`);
      // interpret the swapped bytes as big-endian unsigned integer (== LE of original)
      const leValue = BigInt(`0x${swapped}`);

      entries.push(['As BE', String(beValue)]);
      entries.push(['As LE', String(leValue)]);
    }

    return [
      new BoxBuilder('Byte Swap', kvToPlaintext(entries))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(Object.fromEntries(entries))
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default ByteSwapBoxSource;
