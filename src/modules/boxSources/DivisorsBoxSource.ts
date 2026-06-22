import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_VALUE = 1_000_000_000_000n;

// build a k:v plaintext block from an ordered record — KeyValueBoxTemplate reads
// this as a fallback when no `options` object is set, but we always set both.
function kvToPlaintext(pairs: Record<string, string>): string {
  return Object.entries(pairs)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

// trial-division up to sqrt(n). returns divisors sorted ascending.
function computeDivisors(n: bigint): bigint[] {
  const lo: bigint[] = [];
  const hi: bigint[] = [];
  for (let i = 1n; i * i <= n; i++) {
    if (n % i === 0n) {
      lo.push(i);
      if (i !== n / i) {
        hi.push(n / i);
      }
    }
  }
  // lo is ascending, hi must be reversed to keep full list sorted
  return [...lo, ...hi.reverse()];
}

function buildErrorBox(message: string): Box {
  const pairs = { Error: message };
  return new BoxBuilder('Divisors', kvToPlaintext(pairs))
    .setTemplate(KeyValueBoxTemplate)
    .setOptions(pairs)
    .setPriority(Priority)
    .build();
}

export const DivisorsBoxSource = {
  name: 'Divisors',
  description:
    'List the divisors of a positive integer (up to 10^12) with count, sum, and classification.',
  defaultInput: '28 ::divisors',
  tag: '#',
  kind: 'Calculate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'divisors', 'factors')) return [];

    const raw = trim(input);

    // guard: must be a non-empty decimal integer string
    if (!/^\d+$/.test(raw)) {
      return [buildErrorBox('Input must be a positive integer.')];
    }

    // guard: cap string length before BigInt conversion to avoid DoS via very
    // large decimal strings that are still within JS memory limits
    if (raw.length > 13) {
      return [
        buildErrorBox(`Input too large. Maximum is 10^12 (1,000,000,000,000).`),
      ];
    }

    const n = BigInt(raw);

    if (n < 1n) {
      return [buildErrorBox('Input must be >= 1.')];
    }
    if (n > MAX_VALUE) {
      return [
        buildErrorBox(
          `Input too large. Maximum is 10^12 (${MAX_VALUE.toString()}).`,
        ),
      ];
    }

    const divisors = computeDivisors(n);

    const count = divisors.length;
    const sigma = divisors.reduce((acc, d) => acc + d, 0n);
    const properSum = sigma - n;

    // classify by proper divisor sum
    let classification: string;
    if (n === 1n) {
      // 1 has no proper divisors; its proper sum is 0
      classification = 'deficient';
    } else if (properSum === n) {
      classification = 'perfect';
    } else if (properSum > n) {
      classification = 'abundant';
    } else {
      classification = 'deficient';
    }

    // a prime has exactly two divisors: 1 and itself
    if (count === 2) {
      classification += ' (prime)';
    }

    // cap displayed list at 200 entries to avoid overwhelming the UI
    const MAX_DISPLAY = 200;
    const divisorList =
      divisors.length > MAX_DISPLAY
        ? `${divisors
            .slice(0, MAX_DISPLAY)
            .map((d) => d.toString())
            .join(', ')}…`
        : divisors.map((d) => d.toString()).join(', ');

    const pairs: Record<string, string> = {
      Number: n.toString(),
      Divisors: divisorList,
      Count: count.toString(),
      Sum: sigma.toString(),
      Classification: classification,
    };

    return [
      new BoxBuilder('Divisors', kvToPlaintext(pairs))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(pairs)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default DivisorsBoxSource;
