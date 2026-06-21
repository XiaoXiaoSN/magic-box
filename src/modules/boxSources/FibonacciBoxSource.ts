import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// caps the O(n) loop and protects against absurdly large output strings
const MAX_N = 100_000;

// build plaintext k:v representation for headless consumers
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

// iterative BigInt fibonacci — O(n) time, O(1) extra space
function fibonacci(n: number): bigint {
  let a = 0n;
  let b = 1n;
  for (let i = 0; i < n; i++) {
    [a, b] = [b, a + b];
  }
  return a;
}

export const FibonacciBoxSource = {
  name: 'Fibonacci',
  description:
    'Compute the nth Fibonacci number (F(0)=0, F(1)=1). ::fib=<n> or "<n> ::fib".',
  defaultInput: '100 ::fib',
  tag: '#',
  kind: 'Calculate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'fib', 'fibonacci')) return [];

    // prefer the option value when it carries a numeric argument (e.g. ::fib=20),
    // otherwise fall back to the trimmed input string
    const optionValue = extractOptionKeys(options, 'fib', 'fibonacci');
    const rawN =
      typeof optionValue === 'string' && /^\d+$/.test(optionValue.trim())
        ? optionValue.trim()
        : trim(input);

    if (!/^\d+$/.test(rawN)) {
      const kv: Record<string, string> = {
        Error: `"${rawN}" is not a valid non-negative integer`,
        Range: `n must be an integer between 0 and ${MAX_N}`,
      };
      return [
        new BoxBuilder('Fibonacci', kvToPlaintext(kv))
          .setOptions(kv)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const n = Number.parseInt(rawN, 10);

    if (n > MAX_N) {
      const kv: Record<string, string> = {
        Error: `n=${n} exceeds the maximum allowed value of ${MAX_N}`,
        Range: `n must be an integer between 0 and ${MAX_N}`,
      };
      return [
        new BoxBuilder('Fibonacci', kvToPlaintext(kv))
          .setOptions(kv)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const result = fibonacci(n);
    const resultStr = result.toString();
    const digits = resultStr.length;

    const tooLong = digits > 1000;

    const kv: Record<string, string> = {
      n: String(n),
      'F(n)': tooLong ? 'too long to display' : resultStr,
      Digits: String(digits),
    };

    if (tooLong) {
      kv['First 20'] = resultStr.slice(0, 20);
      kv['Last 20'] = resultStr.slice(-20);
    }

    return [
      new BoxBuilder('Fibonacci', kvToPlaintext(kv))
        .setOptions(kv)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default FibonacciBoxSource;
