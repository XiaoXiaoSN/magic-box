import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// euclid's algorithm on BigInt absolute values
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

// lcm via |a*b| / gcd(a,b); returns 0n if either operand is 0
function lcm(a: bigint, b: bigint): bigint {
  if (a === 0n || b === 0n) return 0n;
  const g = gcd(a, b);
  const product = a * b;
  return product < 0n ? -(product / g) : product / g;
}

export const GcdLcmBoxSource = {
  name: 'GCD / LCM',
  description:
    'Compute the greatest common divisor and least common multiple of a list of integers.',
  defaultInput: '12 18 24 ::gcd',
  tag: '#',
  kind: 'Math',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'gcd', 'lcm', 'gcdlcm')) return [];

    // parse a list of integers separated by whitespace and/or commas
    const tokens = trim(input)
      .split(/[\s,]+/)
      .filter((t) => t.length > 0);
    if (tokens.length < 2) return [];

    // validate each token is an integer; reject the whole input on any invalid token
    for (const t of tokens) {
      if (!/^-?\d+$/.test(t)) return [];
    }

    const values = tokens.map((t) => BigInt(Number.parseInt(t, 10)));
    const gcdResult = values.reduce((acc, v) => gcd(acc, v));
    const lcmResult = values.reduce((acc, v) => lcm(acc, v));

    return [
      new BoxBuilder('GCD / LCM', '')
        .setOptions({
          Numbers: tokens.join(', '),
          GCD: gcdResult.toString(),
          LCM: lcmResult.toString(),
        })
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default GcdLcmBoxSource;
