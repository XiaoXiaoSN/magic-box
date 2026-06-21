import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// builds "k: v\n..." plaintext from a key-value record
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

function makeErrorBox(message: string, priority: number): Box {
  const kv = { Note: message };
  return new BoxBuilder('Modular Exponentiation', kvToPlaintext(kv))
    .setTemplate(KeyValueBoxTemplate)
    .setOptions(kv)
    .setPriority(priority)
    .build();
}

// square-and-multiply: computes (base ^ exp) mod mod in O(log exp) multiplications
function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  // normalise base into [0, mod) to handle negative inputs
  base = ((base % mod) + mod) % mod;
  let result = 1n;
  while (exp > 0n) {
    if (exp & 1n) {
      result = (result * base) % mod;
    }
    base = (base * base) % mod;
    exp >>= 1n;
  }
  return result;
}

export const ModPowBoxSource = {
  name: 'Modular Exponentiation',
  description:
    'Compute (base ^ exponent) mod modulus efficiently. Input: "base exponent modulus".',
  defaultInput: '4 13 497 ::modpow',
  tag: '#',
  kind: 'Calculate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'modpow', 'powmod')) return [];

    const raw = trim(input).slice(0, 5000);

    // split on whitespace and/or commas
    const tokens = raw.split(/[\s,]+/).filter(Boolean);

    if (tokens.length !== 3 || tokens.some((t) => !/^-?\d+$/.test(t))) {
      return [
        makeErrorBox(
          'Expected exactly 3 integers: base exponent modulus.',
          this.priority,
        ),
      ];
    }

    // cap operand magnitude: square-and-multiply does O(log exp) BigInt
    // multiplications over the modulus; huge operands would stall the main
    // thread synchronously on every keystroke (input is the URL ?input= param)
    if (tokens.some((t) => t.replace(/^-/, '').length > 100)) {
      return [
        makeErrorBox('Each operand must be at most 100 digits.', this.priority),
      ];
    }

    const base = BigInt(tokens[0]);
    const exponent = BigInt(tokens[1]);
    const modulus = BigInt(tokens[2]);

    if (exponent < 0n) {
      return [makeErrorBox('Exponent must be >= 0.', this.priority)];
    }

    if (modulus <= 0n) {
      return [makeErrorBox('Modulus must be > 0.', this.priority)];
    }

    const result = modPow(base, exponent, modulus);

    const kv: Record<string, string> = {
      Base: String(base),
      Exponent: String(exponent),
      Modulus: String(modulus),
      Result: String(result),
    };

    return [
      new BoxBuilder('Modular Exponentiation', kvToPlaintext(kv))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kv)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default ModPowBoxSource;
