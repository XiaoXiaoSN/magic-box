import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// fletcher-16 over utf-8 bytes; returns (sum2 << 8) | sum1
function computeFletcher16(input: string): {
  checksum: number;
  sum1: number;
  sum2: number;
} {
  const bytes = new TextEncoder().encode(input);
  let sum1 = 0;
  let sum2 = 0;
  for (const b of bytes) {
    sum1 = (sum1 + b) % 255;
    sum2 = (sum2 + sum1) % 255;
  }
  return { checksum: (sum2 << 8) | sum1, sum1, sum2 };
}

export const Fletcher16BoxSource = {
  name: 'Fletcher-16',
  description: 'Compute the Fletcher-16 checksum of the input text.',
  defaultInput: 'abcde ::fletcher16',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'fletcher16', 'fletcher')) return [];
    if (
      !isString(input) ||
      trim(input).length === 0 ||
      input.length > MAX_INPUT
    )
      return [];

    const { checksum, sum1, sum2 } = computeFletcher16(input);
    const hex = `0x${checksum.toString(16).padStart(4, '0')}`;

    const kvOptions: Record<string, string> = {
      Checksum: checksum.toString(),
      Hex: hex,
      Sum1: sum1.toString(),
      Sum2: sum2.toString(),
    };

    const plaintext = Object.entries(kvOptions)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('Fletcher-16', plaintext)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kvOptions)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default Fletcher16BoxSource;
