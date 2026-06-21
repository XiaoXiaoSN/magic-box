import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// encode: n XOR (n >> 1) produces the gray code for integer n
function encodeGray(n: bigint): bigint {
  return n ^ (n >> 1n);
}

// decode: convert a gray code back to the natural binary integer
// each output bit is the XOR of all gray bits from MSB down to that position
function decodeGray(g: bigint): bigint {
  let n = g;
  // shift and XOR until the shift exceeds the bit width
  for (let shift = 1n; 1n << shift <= g; shift <<= 1n) {
    n ^= n >> shift;
  }
  return n;
}

export const GrayCodeBoxSource = {
  name: 'Gray Code',
  description:
    'Convert a non-negative integer to its Gray code, or a Gray code (binary) back to an integer.',
  defaultInput: '4 ::gray',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantEncode = hasOptionKeys(options, 'gray', 'graycode');
    const wantDecode = hasOptionKeys(options, 'graydecode');
    if (!wantEncode && !wantDecode) return [];

    const raw = trim(input);

    if (wantEncode) {
      // accept only non-negative decimal integers
      if (!/^\d+$/.test(raw)) return [];

      const n = BigInt(Number.parseInt(raw, 10));
      const gray = encodeGray(n);

      const box = new BoxBuilder('Gray Code', gray.toString(2))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions({
          Decimal: n.toString(10),
          Binary: n.toString(2),
          'Gray (binary)': gray.toString(2),
          'Gray (decimal)': gray.toString(10),
        })
        .setPriority(this.priority)
        .build();

      return [box];
    }

    // wantDecode: accept only binary strings
    if (!/^[01]+$/.test(raw)) return [];

    const g = BigInt(`0b${raw}`);
    const n = decodeGray(g);

    const box = new BoxBuilder('Gray Code', n.toString(10))
      .setTemplate(KeyValueBoxTemplate)
      .setOptions({
        'Gray (binary)': raw,
        Decimal: n.toString(10),
        Binary: n.toString(2),
      })
      .setPriority(this.priority)
      .build();

    return [box];
  },
};

export default GrayCodeBoxSource;
