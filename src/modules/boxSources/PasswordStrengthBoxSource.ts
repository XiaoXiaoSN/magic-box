import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 10_000;

// character pool sizes for each class
const POOL_LOWERCASE = 26;
const POOL_UPPERCASE = 26;
const POOL_DIGITS = 10;
// printable ASCII symbols: !"#$%&'()*+,-./:;<=>?@[\]^_`{|}~ (33 chars)
const POOL_SYMBOLS = 33;
// conservative estimate for non-ASCII characters (e.g. unicode, emoji)
const POOL_NON_ASCII = 100;

function computePool(input: string): number {
  let pool = 0;
  if (/[a-z]/.test(input)) pool += POOL_LOWERCASE;
  if (/[A-Z]/.test(input)) pool += POOL_UPPERCASE;
  if (/[0-9]/.test(input)) pool += POOL_DIGITS;
  if (/[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/.test(input)) pool += POOL_SYMBOLS;
  // any character outside printable ASCII range
  if (/[^\x20-\x7e]/.test(input)) pool += POOL_NON_ASCII;
  return pool;
}

// naive shannon entropy by charset — does NOT account for dictionary words or patterns
function computeEntropy(length: number, pool: number): number {
  if (pool <= 0) return 0;
  return Math.round(length * Math.log2(pool) * 10) / 10;
}

function rateEntropy(entropy: number): string {
  if (entropy < 28) return 'Very Weak';
  if (entropy < 36) return 'Weak';
  if (entropy < 60) return 'Reasonable';
  if (entropy < 128) return 'Strong';
  return 'Very Strong';
}

export const PasswordStrengthBoxSource = {
  name: 'Password Strength',
  description: 'Estimate password entropy (bits) and a rough strength rating.',
  defaultInput: 'Tr0ub4dour&3 ::strength',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'strength', 'pwstrength')) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    const pool = computePool(input);
    const entropy = computeEntropy(input.length, pool);
    const rating = rateEntropy(entropy);

    const kvOptions: Record<string, string> = {
      Length: String(input.length),
      'Charset Size': String(pool),
      'Entropy (bits)': String(entropy),
      Rating: rating,
    };

    return [
      new BoxBuilder('Password Strength', '')
        .setOptions(kvOptions)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default PasswordStrengthBoxSource;
