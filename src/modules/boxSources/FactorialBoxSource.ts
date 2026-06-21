import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// cap to bound the O(n) bigint product and the output string size
// cap at 20000: 20000! is ~77k digits and computes in ~25ms; 100000! blocks
// the main thread for ~1.7s (O(n) bigint mults on a growing product)
const MAX_N = 20_000;

// threshold above which we abbreviate the full decimal expansion
const FULL_DISPLAY_THRESHOLD = 2000;

// build plaintext k:v representation for headless consumers
function kvToPlaintext(pairs: Record<string, string>): string {
  return Object.entries(pairs)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

// compute n! exactly using BigInt
function factorial(n: number): bigint {
  let result = 1n;
  for (let i = 2n; i <= BigInt(n); i++) {
    result *= i;
  }
  return result;
}

export const FactorialBoxSource = {
  name: 'Factorial',
  description:
    'Compute n! exactly for a non-negative integer. ::factorial=<n> or "<n> ::factorial".',
  defaultInput: '20 ::factorial',
  tag: '#',
  kind: 'Calculate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'factorial')) return [];

    // prefer the option value if it carries a numeric string; else fall back to trimmed input
    const optionVal = extractOptionKeys(options, 'factorial');
    const raw =
      typeof optionVal === 'string' && /^\d+$/.test(optionVal)
        ? optionVal
        : trim(input);

    if (!/^\d+$/.test(raw)) {
      const kv: Record<string, string> = {
        Error: 'n must be a non-negative integer (digits only)',
        Hint: `Use ::factorial=<n> or "<n> ::factorial" where n <= ${MAX_N}`,
      };
      return [
        new BoxBuilder('Factorial', kvToPlaintext(kv))
          .setOptions(kv)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const n = Number.parseInt(raw, 10);

    if (n > MAX_N) {
      const kv: Record<string, string> = {
        Error: `n must be <= ${MAX_N} (got ${n})`,
      };
      return [
        new BoxBuilder('Factorial', kvToPlaintext(kv))
          .setOptions(kv)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const result = factorial(n);
    const resultStr = result.toString();
    const digits = resultStr.length;

    const kv: Record<string, string> = {
      n: n.toString(),
    };

    if (n <= FULL_DISPLAY_THRESHOLD) {
      kv['n!'] = resultStr;
    } else {
      kv['n!'] = 'too long to display in full';
      // scientific approximation: first digit + exponent
      const firstDigit = resultStr[0];
      const exp = digits - 1;
      kv.Approx = `${firstDigit}.???e+${exp}`;
      kv['First 20'] = resultStr.slice(0, 20);
      kv['Last 20'] = resultStr.slice(-20);
    }

    kv.Digits = digits.toString();

    return [
      new BoxBuilder('Factorial', kvToPlaintext(kv))
        .setOptions(kv)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default FactorialBoxSource;
