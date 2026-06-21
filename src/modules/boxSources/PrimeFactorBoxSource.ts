import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// sqrt(10^12) = 1e6 trial-division steps — acceptable worst case
const MAX_VALUE = 1_000_000_000_000n; // 10^12
const MAX_DIGITS = 13;

interface FactorMap {
  [prime: string]: number;
}

// trial division — returns a map of prime → exponent
function factorize(n: bigint): FactorMap {
  const factors: FactorMap = {};

  let remaining = n;
  while (remaining % 2n === 0n) {
    factors['2'] = (factors['2'] ?? 0) + 1;
    remaining /= 2n;
  }

  for (let i = 3n; i * i <= remaining; i += 2n) {
    while (remaining % i === 0n) {
      const key = i.toString();
      factors[key] = (factors[key] ?? 0) + 1;
      remaining /= i;
    }
  }

  if (remaining > 1n) {
    const key = remaining.toString();
    factors[key] = (factors[key] ?? 0) + 1;
  }

  return factors;
}

// formats factors as '2^3 × 3^2 × 5' (exponent omitted when 1)
function formatFactorization(factors: FactorMap): string {
  return Object.entries(factors)
    .map(([prime, exp]) => (exp === 1 ? prime : `${prime}^${exp}`))
    .join(' × ');
}

// error box explaining valid input range
function rangeErrorBox(reason: string): Box {
  return new BoxBuilder(
    'Prime Factors',
    `Error: ${reason}\nValid range: integer between 2 and 10^12 (up to 13 digits).`,
  )
    .setOptions({
      Error: reason,
      'Valid Range': '2 to 10^12 (up to 13 digits)',
    })
    .setTemplate(KeyValueBoxTemplate)
    .setPriority(Priority)
    .build();
}

export const PrimeFactorBoxSource = {
  name: 'Prime Factors',
  description:
    'Test primality and show the prime factorization of an integer (up to 10^12).',
  defaultInput: '360 ::isprime',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'isprime', 'factor', 'primefactors')) return [];

    const raw = trim(input);

    // require purely numeric, capped at MAX_DIGITS characters
    if (!/^\d+$/.test(raw)) {
      return [
        rangeErrorBox(
          'Input must be a positive integer with no spaces or signs.',
        ),
      ];
    }

    if (raw.length > MAX_DIGITS) {
      return [
        rangeErrorBox(
          `Number too large — maximum is 10^12 (${MAX_DIGITS} digits).`,
        ),
      ];
    }

    const value = BigInt(raw);

    if (value < 2n) {
      return [
        rangeErrorBox(
          'Input must be >= 2 (1 and 0 are not prime by definition).',
        ),
      ];
    }

    if (value > MAX_VALUE) {
      return [
        rangeErrorBox(
          `Number exceeds 10^12 — factorization would be too slow.`,
        ),
      ];
    }

    const factors = factorize(value);
    const isPrime =
      Object.keys(factors).length === 1 && Object.values(factors)[0] === 1;

    const factorizationStr = isPrime ? raw : formatFactorization(factors);

    // divisor count = product of (exponent + 1) for each prime factor
    const divisorCount = Object.values(factors).reduce(
      (acc, exp) => acc * (exp + 1),
      1,
    );

    const kvOptions: Record<string, string> = {
      Number: raw,
      Prime: isPrime ? 'true' : 'false',
      Factorization: factorizationStr,
      'Divisor Count': divisorCount.toString(),
    };

    const plaintext = Object.entries(kvOptions)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('Prime Factors', plaintext)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kvOptions)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default PrimeFactorBoxSource;
