import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// compute Shannon entropy (bits per symbol) by iterating code points
function computeEntropy(input: string): {
  entropy: number;
  length: number;
  uniqueSymbols: number;
  totalBits: number;
} {
  const freq = new Map<string, number>();
  let n = 0;
  for (const cp of input) {
    freq.set(cp, (freq.get(cp) ?? 0) + 1);
    n++;
  }

  let h = 0;
  for (const count of freq.values()) {
    const p = count / n;
    h -= p * Math.log2(p);
  }

  return {
    entropy: h,
    length: n,
    uniqueSymbols: freq.size,
    totalBits: Math.round(h * n),
  };
}

export const ShannonEntropyBoxSource = {
  name: 'Shannon Entropy',
  description:
    'Compute the Shannon entropy (bits per symbol) of the input text.',
  defaultInput: 'aaaabbbbcccd ::entropy',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'entropy', 'shannon')) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    const { entropy, length, uniqueSymbols, totalBits } = computeEntropy(input);

    const entropyStr = `${entropy.toFixed(3)} bits/symbol`;
    const lengthStr = `${length} symbols`;
    const uniqueStr = `${uniqueSymbols}`;
    const totalBitsStr = `${totalBits}`;

    // plaintext k:v lines for the box content
    const content = `Entropy: ${entropyStr}
Length: ${lengthStr}
Unique Symbols: ${uniqueStr}
Total Bits: ${totalBitsStr}`;

    const output: Record<string, string> = {
      Entropy: entropyStr,
      Length: lengthStr,
      'Unique Symbols': uniqueStr,
      'Total Bits': totalBitsStr,
    };

    return [
      new BoxBuilder('Shannon Entropy', content)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(output)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default ShannonEntropyBoxSource;
