import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, errorBox, hasOptionKeys } from '@modules/Box';

const MAX_INPUT_LENGTH = 64;

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

// formats mixed number, e.g. '1 1/4' for 5/4; returns null for proper or integer values
function mixedStr(num: bigint, den: bigint): string | null {
  const absNum = num < 0n ? -num : num;
  if (absNum < den || num % den === 0n) return null;
  const whole = num / den;
  const rem = num < 0n ? -(-num % den) : num % den;
  if (rem === 0n) return `${whole}`;
  return `${whole} ${rem < 0n ? -rem : rem}/${den}`;
}

const MAX_SIGNIFICANT_DIGITS = 12;
const MAX_FIXED_FRACTION_DIGITS = 64;
const MAX_DIVISION_STEPS = MAX_INPUT_LENGTH * 8;

function decimalFromFraction(num: bigint, den: bigint): string {
  const negative = num < 0n;
  const numerator = negative ? -num : num;
  const whole = numerator / den;
  let remainder = numerator % den;
  if (remainder === 0n) return `${negative ? '-' : ''}${whole}`;

  const digits: string[] = [];
  if (whole > 0n) {
    for (
      let index = 0;
      index < MAX_SIGNIFICANT_DIGITS && remainder !== 0n;
      index++
    ) {
      remainder *= 10n;
      digits.push((remainder / den).toString());
      remainder %= den;
    }

    const fullDecimal = digits.join('');
    const decimal = fullDecimal.replace(/0+$/, '') || fullDecimal;
    const suffix = remainder === 0n ? '' : '…';
    return `${negative ? '-' : ''}${whole}.${decimal}${suffix}`;
  }

  let leadingZeros = 0;
  let steps = 0;
  while (
    remainder !== 0n &&
    digits.length < MAX_SIGNIFICANT_DIGITS &&
    steps < MAX_DIVISION_STEPS
  ) {
    remainder *= 10n;
    const digit = (remainder / den).toString();
    remainder %= den;
    steps++;
    if (digits.length === 0 && digit === '0') {
      leadingZeros++;
    } else {
      digits.push(digit);
    }
  }

  const suffix = remainder === 0n ? '' : '…';
  const fractionalLength = leadingZeros + digits.length;
  if (fractionalLength <= MAX_FIXED_FRACTION_DIGITS) {
    return `${negative ? '-' : ''}0.${'0'.repeat(leadingZeros)}${digits.join('')}${suffix}`;
  }

  const exponent = -(leadingZeros + 1);
  const significant = digits.join('');
  const mantissa =
    significant.length === 1
      ? significant
      : `${significant[0]}.${significant.slice(1)}`;
  return `${negative ? '-' : ''}${mantissa}e${exponent}${suffix}`;
}

// builds the plaintext kv string for KeyValueBoxTemplate
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

const FRACTION_RE = /^(-?\d+)\s*\/\s*(\d+)$/;
const DECIMAL_RE = /^-?(?:\d+(\.\d+)?|\.\d+)$/;

export const FractionBoxSource = {
  defaultDisabled: true,
  name: 'Fraction',
  description:
    'Convert a decimal to a simplified fraction, or a fraction (a/b) to a decimal.',
  defaultInput: '0.75\n::fraction',
  tag: '#',
  kind: 'Convert',

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'fraction', 'tofraction')) return [];

    if (input.length > MAX_INPUT_LENGTH) {
      return [
        errorBox(
          'Fraction',
          `Input is too large (${input.length} characters, limit ${MAX_INPUT_LENGTH}).`,
        ),
      ];
    }

    const raw = trim(input);
    if (!raw) return [];

    // fraction a/b → decimal
    const fracMatch = FRACTION_RE.exec(raw);
    if (fracMatch) {
      const num = BigInt(fracMatch[1]);
      const den = BigInt(fracMatch[2]);

      if (den === 0n) {
        const kv = { Error: 'denominator cannot be zero' };
        return [
          new BoxBuilder('Fraction', kvToPlaintext(kv))
            .setView('keyValue')
            .setOptions(kv)

            .build(),
        ];
      }

      const { numerator: sNum, denominator: sDen } = reduce(num, den);
      const simplified = fractionStr(sNum, sDen);

      const decimalStr = decimalFromFraction(num, den);

      const kv: Record<string, string> = {
        Fraction: simplified,
        Decimal: decimalStr,
      };
      return [
        new BoxBuilder('Fraction', kvToPlaintext(kv))
          .setView('keyValue')
          .setOptions(kv)

          .build(),
      ];
    }

    // decimal → fraction
    const decMatch = DECIMAL_RE.exec(raw);
    if (decMatch) {
      const normalized = raw.startsWith('-.')
        ? `-0${raw.slice(1)}`
        : raw.startsWith('.')
          ? `0${raw}`
          : raw;
      const dotIndex = normalized.indexOf('.');
      const decimalPlaces =
        dotIndex === -1 ? 0 : normalized.length - dotIndex - 1;

      const denominator = 10n ** BigInt(decimalPlaces);
      // parse the number as an integer by removing the dot
      const intStr = normalized.replace('.', '');
      const numerator = BigInt(intStr);

      const { numerator: sNum, denominator: sDen } = reduce(
        numerator,
        denominator,
      );
      const fracResult = fractionStr(sNum, sDen);
      const mixed = mixedStr(sNum, sDen);

      const decimalStr = normalized;

      const kv: Record<string, string> = {
        Decimal: decimalStr,
        Fraction: fracResult,
      };
      if (mixed !== null) {
        kv.Mixed = mixed;
      }

      return [
        new BoxBuilder('Fraction', kvToPlaintext(kv))
          .setView('keyValue')
          .setOptions(kv)

          .build(),
      ];
    }

    // unrecognized format — show usage hint
    const kv = {
      Usage: 'Enter a decimal like 0.75 or a fraction like 3/4',
    };
    return [
      new BoxBuilder('Fraction', kvToPlaintext(kv))
        .setView('keyValue')
        .setOptions(kv)

        .build(),
    ];
  },
};

export default FractionBoxSource;
