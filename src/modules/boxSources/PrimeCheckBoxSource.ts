import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// cap to prevent trial division from running too long: sqrt(10^13) ≈ 3.16e6 iterations
// cap at 10^10: a single O(sqrt n) trial-division pass is ~100k iterations
// (~1ms); next/prev-prime probe many candidates, so a higher cap risks a
// multi-hundred-ms freeze on slower devices
const MAX_VALUE = 10_000_000_000n;

// bound the next/prev prime search to avoid indefinite scanning
const MAX_PRIME_SEARCH_STEPS = 100_000n;

// renders a key-value record as "key: value" lines for plaintext consumers
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

// trial division primality test using BigInt; correct for all n >= 0
function isPrime(n: bigint): boolean {
  if (n < 2n) return false;
  if (n < 4n) return true;
  if (n % 2n === 0n) return false;
  for (let i = 3n; i * i <= n; i += 2n) {
    if (n % i === 0n) return false;
  }
  return true;
}

// returns the smallest prime factor of n (n must be composite and >= 2)
function smallestFactor(n: bigint): bigint {
  if (n % 2n === 0n) return 2n;
  for (let i = 3n; i * i <= n; i += 2n) {
    if (n % i === 0n) return i;
  }
  // n is prime; caller is responsible for not reaching here
  return n;
}

// finds the next prime strictly greater than n; returns null if search bound exceeded
function nextPrime(n: bigint): bigint | null {
  let candidate = n + 1n;
  const limit = n + MAX_PRIME_SEARCH_STEPS;
  while (candidate <= limit) {
    if (isPrime(candidate)) return candidate;
    candidate++;
  }
  return null;
}

// finds the largest prime strictly less than n; returns null if n <= 2 (none exists)
function prevPrime(n: bigint): bigint | null {
  if (n <= 2n) return null;
  let candidate = n - 1n;
  const limit = n > MAX_PRIME_SEARCH_STEPS ? n - MAX_PRIME_SEARCH_STEPS : 2n;
  while (candidate >= limit) {
    if (isPrime(candidate)) return candidate;
    candidate--;
  }
  return null;
}

export const PrimeCheckBoxSource = {
  defaultDisabled: true,
  name: 'Prime Check',
  description:
    'Test whether an integer is prime, and find the next and previous primes (up to 10^13).',
  defaultInput: '97 ::isprime',
  tag: '#',
  kind: 'Calculate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'isprime', 'prime')) return [];

    const raw = trim(input);

    // reject strings that are too long or not pure digits
    if (raw.length > 16 || !/^\d+$/.test(raw)) {
      const kv: Record<string, string> = {
        Error: 'Input must be a non-negative integer with at most 16 digits.',
      };
      return [
        new BoxBuilder('Prime Check', kvToPlaintext(kv))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(kv)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const n = BigInt(raw);

    if (n > MAX_VALUE) {
      const kv: Record<string, string> = {
        Error: `Value exceeds maximum of ${MAX_VALUE.toLocaleString()} (10^10). Use a smaller number.`,
      };
      return [
        new BoxBuilder('Prime Check', kvToPlaintext(kv))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(kv)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const prime = isPrime(n);
    const next = nextPrime(n);
    const prev = prevPrime(n);

    const kv: Record<string, string> = {
      Number: n.toString(),
      'Is Prime': prime ? 'true' : 'false',
      'Next Prime': next !== null ? next.toString() : 'search limit exceeded',
      'Previous Prime': prev !== null ? prev.toString() : 'none',
    };

    // include the smallest factor only for composite numbers >= 2
    if (!prime && n >= 2n) {
      kv['Smallest Factor'] = smallestFactor(n).toString();
    }

    return [
      new BoxBuilder('Prime Check', kvToPlaintext(kv))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kv)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default PrimeCheckBoxSource;
