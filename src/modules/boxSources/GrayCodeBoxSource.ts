import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// max input length guard to avoid runaway allocations on huge strings
// cap kept low: BigInt() decimal parsing is O(n^2) in digit count, and 100
// digits covers any realistic Gray-code use while preventing a main-thread stall
const MAX_INPUT_LENGTH = 100;

export const GrayCodeBoxSource = {
  name: 'Gray Code',
  description:
    'Convert a non-negative integer to its reflected binary Gray code.',
  defaultInput: '5 ::gray',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'gray', 'graycode')) return [];

    const raw = trim(input);
    if (raw.length > MAX_INPUT_LENGTH) return [];

    // only accept non-negative decimal integers
    if (!/^\d+$/.test(raw)) {
      const plaintextOutput = 'Error: a non-negative integer is required.';
      return [
        new BoxBuilder('Gray Code', plaintextOutput)
          .setOptions({ Error: 'a non-negative integer is required.' })
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(Priority)
          .build(),
      ];
    }

    const n = BigInt(raw);
    const gray = n ^ (n >> 1n);

    const decimalStr = n.toString();
    const binaryStr = n === 0n ? '0' : n.toString(2);
    const grayBinaryStr = gray === 0n ? '0' : gray.toString(2);
    const grayDecimalStr = gray.toString();

    const plaintextOutput = [
      `Decimal: ${decimalStr}`,
      `Binary: ${binaryStr}`,
      `Gray (binary): ${grayBinaryStr}`,
      `Gray (decimal): ${grayDecimalStr}`,
    ].join('\n');

    const outputOptions: Record<string, string> = {
      Decimal: decimalStr,
      Binary: binaryStr,
      'Gray (binary)': grayBinaryStr,
      'Gray (decimal)': grayDecimalStr,
    };

    return [
      new BoxBuilder('Gray Code', plaintextOutput)
        .setOptions(outputOptions)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(Priority)
        .build(),
    ];
  },
};

export default GrayCodeBoxSource;
