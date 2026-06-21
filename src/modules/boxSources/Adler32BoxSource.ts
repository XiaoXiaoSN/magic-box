import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 20;
const MAX_INPUT = 100_000;
// adler-32 modulus (largest prime < 2^16)
const MOD_ADLER = 65521;

// compute adler-32 checksum over the utf-8 encoding of `str`
function computeAdler32(str: string): number {
  const bytes = new TextEncoder().encode(str);
  let a = 1;
  let b = 0;
  for (const byte of bytes) {
    a = (a + byte) % MOD_ADLER;
    b = (b + a) % MOD_ADLER;
  }
  return ((b << 16) | a) >>> 0;
}

export const Adler32BoxSource = {
  name: 'Adler-32',
  description: 'Compute the Adler-32 checksum of the input text.',
  defaultInput: 'Wikipedia ::adler32',
  tag: '#',
  kind: 'Hash',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'adler32', 'adler')) return [];
    if (input.length === 0 || input.length > MAX_INPUT) return [];

    const checksum = computeAdler32(input);
    const hex = checksum.toString(16).padStart(8, '0');
    const decimal = checksum.toString(10);

    const output: Record<string, string> = {
      Hex: hex,
      Decimal: decimal,
    };

    return [
      new BoxBuilder('Adler-32', `Hex: ${hex}\nDecimal: ${decimal}`)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(output)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default Adler32BoxSource;
