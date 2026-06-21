import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// maximum input string length to accept (guards against pathological inputs)
const MAX_INPUT_LEN = 5000;

// count set bits via iterative bit-scan (BigInt safe, no overflow)
function popcount(n: bigint): bigint {
  let count = 0n;
  let v = n;
  while (v > 0n) {
    count += v & 1n;
    v >>= 1n;
  }
  return count;
}

// number of trailing zero bits; defined as 0 for the value 0
function trailingZeros(n: bigint): bigint {
  if (n === 0n) return 0n;
  let count = 0n;
  let v = n;
  while ((v & 1n) === 0n) {
    count++;
    v >>= 1n;
  }
  return count;
}

// position of the highest set bit (bit length); 0 for the value 0
function bitLength(n: bigint): number {
  if (n === 0n) return 0;
  return n.toString(2).length;
}

// render k:v pairs as a plaintext string for plaintextOutput
function kvToPlaintext(pairs: Record<string, string>): string {
  return Object.entries(pairs)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

export const PopcountBoxSource = {
  name: 'Popcount',
  description:
    'Count set bits (population count) and bit length of a non-negative integer.',
  defaultInput: '255 ::popcount',
  tag: '#',
  kind: 'Calculate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'popcount', 'bitcount')) return [];

    const raw = trim(input);

    // guard against unreasonably large strings
    if (raw.length > MAX_INPUT_LEN) {
      const kv = { Error: 'Input too long (max 5000 chars).' };
      return [
        new BoxBuilder('Popcount', kvToPlaintext(kv))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(kv)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // accept decimal, 0x hex, or 0b binary — all non-negative
    const isDecimal = /^\d+$/.test(raw);
    const isHex = /^0x[0-9a-f]+$/i.test(raw);
    const isBinary = /^0b[01]+$/i.test(raw);

    if (!isDecimal && !isHex && !isBinary) {
      const kv = {
        Error:
          'A non-negative integer (decimal, 0x hex, or 0b binary) is required.',
      };
      return [
        new BoxBuilder('Popcount', kvToPlaintext(kv))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(kv)
          .setPriority(this.priority)
          .build(),
      ];
    }

    let n: bigint;
    try {
      n = BigInt(raw);
    } catch {
      const kv = {
        Error:
          'A non-negative integer (decimal, 0x hex, or 0b binary) is required.',
      };
      return [
        new BoxBuilder('Popcount', kvToPlaintext(kv))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(kv)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const setBits = popcount(n);
    const bitLen = bitLength(n);
    const trailing = trailingZeros(n);

    const kv: Record<string, string> = {
      Decimal: n.toString(10),
      Binary: `0b${n.toString(2)}`,
      Hex: `0x${n.toString(16)}`,
      'Set Bits': setBits.toString(),
      'Bit Length': bitLen.toString(),
      'Trailing Zeros': trailing.toString(),
    };

    return [
      new BoxBuilder('Popcount', kvToPlaintext(kv))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kv)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default PopcountBoxSource;
