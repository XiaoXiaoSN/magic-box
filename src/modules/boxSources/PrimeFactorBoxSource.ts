import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_VALUE = 1_000_000_000_000n; // 10^12

// builds "k: v\n..." plaintext from a key-value record
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

// trial-division factorization; only called when n >= 2 and n <= MAX_VALUE
function primeFactors(n: bigint): Map<bigint, number> {
  const factors = new Map<bigint, number>();

  // divide out all 2s
  while (n % 2n === 0n) {
    factors.set(2n, (factors.get(2n) ?? 0) + 1);
    n /= 2n;
  }

  // odd divisors from 3 up to sqrt(n)
  for (let i = 3n; i * i <= n; i += 2n) {
    while (n % i === 0n) {
      factors.set(i, (factors.get(i) ?? 0) + 1);
      n /= i;
    }
  }

  // remaining factor is prime
  if (n > 1n) {
    factors.set(n, (factors.get(n) ?? 0) + 1);
  }

  return factors;
}

// formats the factorization map as e.g. "2^3 × 3^2 × 5"
function formatFactorization(factors: Map<bigint, number>): string {
  return [...factors.entries()]
    .map(([p, exp]) => (exp === 1 ? String(p) : `${p}^${exp}`))
    .join(' × ');
}

function makeErrorBox(message: string, priority: number): Box {
  const kv = { Note: message };
  return new BoxBuilder('Prime Factorization', kvToPlaintext(kv))
    .setTemplate(KeyValueBoxTemplate)
    .setOptions(kv)
    .setPriority(priority)
    .build();
}

export const PrimeFactorBoxSource = {
  name: 'Prime Factorization',
  description: 'Factor an integer into its prime factors (up to 10^12).',
  defaultInput: '360 ::factor',
  tag: '#',
  kind: 'Calculate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'factor', 'factorize', 'primefactor')) {
      return [];
    }

    const raw = trim(input);

    // reject non-digit strings or strings too long to factor in the browser
    if (!/^\d+$/.test(raw)) {
      return [
        makeErrorBox(
          'Input must be a positive integer (digits only).',
          this.priority,
        ),
      ];
    }

    // cap at 13 digits so sqrt stays within ~1 M iterations
    if (raw.length > 13) {
      return [
        makeErrorBox(
          'Number is too large to factor in the browser. Maximum supported value is 10^12.',
          this.priority,
        ),
      ];
    }

    const n = BigInt(raw);

    if (n < 2n || n > MAX_VALUE) {
      return [
        makeErrorBox(
          'Input must be an integer between 2 and 10^12.',
          this.priority,
        ),
      ];
    }

    const factors = primeFactors(n);
    const factorizationStr = formatFactorization(factors);
    const primeList = [...factors.keys()].map(String).join(', ');
    const isPrime = factors.size === 1 && [...factors.values()][0] === 1;

    const kv: Record<string, string> = {
      Number: raw,
      Factorization: factorizationStr,
      'Prime Factors': primeList,
      'Is Prime': String(isPrime),
    };

    return [
      new BoxBuilder('Prime Factorization', kvToPlaintext(kv))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kv)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default PrimeFactorBoxSource;
