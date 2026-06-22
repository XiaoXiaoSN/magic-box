import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// euclid gcd for non-negative bigints
function gcd(a: bigint, b: bigint): bigint {
  while (b !== 0n) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

interface FractionResult {
  numerator: bigint;
  denominator: bigint;
}

// reduces a fraction to lowest terms; denominator is always positive
function reduce(num: bigint, den: bigint): FractionResult {
  if (den < 0n) {
    num = -num;
    den = -den;
  }
  const g = gcd(num < 0n ? -num : num, den);
  return { numerator: num / g, denominator: den / g };
}

// formats a fraction string, e.g. '3/4' or '-1/2'
function fractionStr(num: bigint, den: bigint): string {
  if (den === 1n) return `${num}`;
  return `${num}/${den}`;
}

// formats mixed number, e.g. '1 1/4' for 5/4; returns undefined if |num| < den
function mixedStr(num: bigint, den: bigint): string | null {
  const absNum = num < 0n ? -num : num;
  if (absNum <= den) return null;
  const whole = num / den;
  const rem = num < 0n ? -(-num % den) : num % den;
  if (rem === 0n) return `${whole}`;
  return `${whole} ${rem < 0n ? -rem : rem}/${den}`;
}

// builds the plaintext kv string for KeyValueBoxTemplate
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

// max input length to prevent abuse
const MAX_INPUT_LENGTH = 64;

const FRACTION_RE = /^(-?\d+)\s*\/\s*(\d+)$/;
const DECIMAL_RE = /^-?\d+(\.\d+)?$/;

export const FractionBoxSource = {
  name: 'Fraction',
  description:
    'Convert a decimal to a simplified fraction, or a fraction (a/b) to a decimal.',
  defaultInput: '0.75 ::fraction',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'fraction', 'tofraction')) return [];

    const raw = trim(input);
    if (!raw || raw.length > MAX_INPUT_LENGTH) return [];

    // fraction a/b → decimal
    const fracMatch = FRACTION_RE.exec(raw);
    if (fracMatch) {
      const num = BigInt(fracMatch[1]);
      const den = BigInt(fracMatch[2]);

      if (den === 0n) {
        const kv = { Error: 'denominator cannot be zero' };
        return [
          new BoxBuilder('Fraction', kvToPlaintext(kv))
            .setTemplate(KeyValueBoxTemplate)
            .setOptions(kv)
            .setPriority(this.priority)
            .build(),
        ];
      }

      const { numerator: sNum, denominator: sDen } = reduce(num, den);
      const simplified = fractionStr(sNum, sDen);

      // compute decimal — use Number since we need a floating-point result
      const decimalVal = Number(num) / Number(den);
      // show up to 6 significant decimal places, trim trailing zeros
      const decimalStr = Number.isInteger(decimalVal)
        ? String(decimalVal)
        : decimalVal.toFixed(6).replace(/\.?0+$/, '');

      const kv: Record<string, string> = {
        Fraction: simplified,
        Decimal: decimalStr,
      };
      return [
        new BoxBuilder('Fraction', kvToPlaintext(kv))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(kv)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // decimal → fraction
    const decMatch = DECIMAL_RE.exec(raw);
    if (decMatch) {
      const dotIndex = raw.indexOf('.');
      const decimalPlaces = dotIndex === -1 ? 0 : raw.length - dotIndex - 1;

      const denominator = 10n ** BigInt(decimalPlaces);
      // parse the number as an integer by removing the dot
      const intStr = raw.replace('.', '');
      const numerator = BigInt(intStr);

      const { numerator: sNum, denominator: sDen } = reduce(
        numerator,
        denominator,
      );
      const fracResult = fractionStr(sNum, sDen);
      const mixed = mixedStr(sNum, sDen);

      // recompute the decimal for display
      const decimalVal = Number.parseFloat(raw);
      const decimalStr = Number.isInteger(decimalVal)
        ? String(decimalVal)
        : raw;

      const kv: Record<string, string> = {
        Decimal: decimalStr,
        Fraction: fracResult,
      };
      if (mixed !== null) {
        kv.Mixed = mixed;
      }

      return [
        new BoxBuilder('Fraction', kvToPlaintext(kv))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(kv)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // unrecognized format — show usage hint
    const kv = {
      Usage: 'Enter a decimal like 0.75 or a fraction like 3/4',
    };
    return [
      new BoxBuilder('Fraction', kvToPlaintext(kv))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kv)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default FractionBoxSource;
