import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 10_000;
const MAX_OPERANDS = 1_000;

// token pattern for a bare integer (no decimals, no exponents)
const INTEGER_RE = /^-?\d+$/;

function gcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b !== 0n) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

function lcmOfList(nums: bigint[]): bigint {
  // if any operand is zero the LCM is zero
  if (nums.some((n) => n === 0n)) return 0n;
  // work on magnitudes so a negative first operand can't flip the sign
  const abs = nums.map((n) => (n < 0n ? -n : n));
  return abs.reduce((acc, n) => (acc / gcd(acc, n)) * n);
}

function gcdOfList(nums: bigint[]): bigint {
  return nums.reduce((acc, n) => gcd(acc, n));
}

// build the plaintext representation of a key-value record
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

export const GcdLcmBoxSource = {
  name: 'GCD / LCM',
  description:
    'Compute the GCD and LCM of a list of integers (comma or space separated).',
  defaultInput: '12, 18, 24 ::gcd',
  tag: '#',
  kind: 'Calculate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'gcd', 'lcm')) return [];

    const trimmed = trim(input).slice(0, MAX_INPUT);
    if (!trimmed) {
      const kv = { Note: 'provide at least two integers' };
      return [
        new BoxBuilder('GCD / LCM', kvToPlaintext(kv))
          .setOptions(kv)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(Priority)
          .build(),
      ];
    }

    // split on commas and/or whitespace
    const tokens = trimmed
      .split(/[\s,]+/)
      .filter((t: string) => t.length > 0)
      .slice(0, MAX_OPERANDS);

    // validate: every token must look like a bare integer
    const invalid = tokens.find((t: string) => !INTEGER_RE.test(t));
    if (invalid !== undefined) {
      const kv = { Note: 'all tokens must be integers (e.g. 12, -5, 0)' };
      return [
        new BoxBuilder('GCD / LCM', kvToPlaintext(kv))
          .setOptions(kv)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(Priority)
          .build(),
      ];
    }

    if (tokens.length < 2) {
      const kv = { Note: 'at least two integers are required' };
      return [
        new BoxBuilder('GCD / LCM', kvToPlaintext(kv))
          .setOptions(kv)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(Priority)
          .build(),
      ];
    }

    // use BigInt directly — never go through Number to avoid precision loss
    const nums = tokens.map((t: string) => BigInt(t));

    const gcdResult = gcdOfList(nums);
    const lcmResult = lcmOfList(nums);

    const kv = {
      Numbers: nums.join(', '),
      GCD: String(gcdResult),
      LCM: String(lcmResult),
    };

    return [
      new BoxBuilder('GCD / LCM', kvToPlaintext(kv))
        .setOptions(kv)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(Priority)
        .build(),
    ];
  },
};

export default GcdLcmBoxSource;
