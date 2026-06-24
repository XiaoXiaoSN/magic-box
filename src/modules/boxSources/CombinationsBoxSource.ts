import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_N = 100_000;
// independently cap k = min(r, n-r): cost is O(k) BigInt mults on a product
// that grows to ~k*log(n) digits, so a large k (even with n in range) can
// hang the main thread for minutes. 10000 keeps worst-case well under a second.
const MAX_K = 10_000;

// builds a "key: value\n..." plaintext string for headless rendering
function kvToPlaintext(pairs: Record<string, string>): string {
  return Object.entries(pairs)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

// computes C(n, r) via the integer-safe multiplicative formula using BigInt.
// uses r' = min(r, n-r) for efficiency and avoids huge intermediate factorials.
function combination(n: bigint, r: bigint): bigint {
  const k = r < n - r ? r : n - r;
  let result = 1n;
  for (let i = 0n; i < k; i++) {
    // multiply before divide keeps the running product integral at each step
    result = (result * (n - i)) / (i + 1n);
  }
  return result;
}

// computes P(n, r) = product of (n, n-1, ..., n-r+1) via BigInt
function permutation(n: bigint, r: bigint): bigint {
  let result = 1n;
  for (let i = 0n; i < r; i++) {
    result *= n - i;
  }
  return result;
}

const PARSE_RE = /^(\d+)[\s,]+(\d+)$/;
const CONSTRAINT_MSG = '0 ≤ r ≤ n ≤ 1000000';

export const CombinationsBoxSource = {
  defaultDisabled: true,
  name: 'Combinations / Permutations',
  description:
    'Compute C(n, r) and P(n, r) exactly. Input: "n r" (e.g. "52 5").',
  defaultInput: '52 5 ::ncr',
  tag: '#',
  kind: 'Calculate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'ncr', 'npr', 'choose')) return [];

    const raw = trim(input).slice(0, 100);
    const match = PARSE_RE.exec(raw);

    if (!match) {
      // invalid format — explain expected input
      const pairs = {
        Error: 'expected two non-negative integers, e.g. "52 5"',
        Constraints: CONSTRAINT_MSG,
      };
      return [
        new BoxBuilder('Combinations / Permutations', kvToPlaintext(pairs))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(pairs)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const n = Number(match[1]);
    const r = Number(match[2]);

    const effectiveK = Math.min(r, n - r);
    if (r > n || n > MAX_N || effectiveK > MAX_K) {
      let error: string;
      if (r > n) {
        error = `r (${r}) must be ≤ n (${n})`;
      } else if (n > MAX_N) {
        error = `n (${n}) must be ≤ ${MAX_N}`;
      } else {
        error = `min(r, n-r) = ${effectiveK} is too large; must be ≤ ${MAX_K}`;
      }
      const pairs = {
        Error: error,
        Constraints: CONSTRAINT_MSG,
      };
      return [
        new BoxBuilder('Combinations / Permutations', kvToPlaintext(pairs))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(pairs)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const bn = BigInt(n);
    const br = BigInt(r);
    const c = combination(bn, br);
    const p = permutation(bn, br);

    const pairs = {
      n: String(n),
      r: String(r),
      'C(n, r)': String(c),
      'P(n, r)': String(p),
    };

    return [
      new BoxBuilder('Combinations / Permutations', kvToPlaintext(pairs))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(pairs)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default CombinationsBoxSource;
