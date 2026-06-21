import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// valid decimal or scientific notation number (optional sign, digits, optional decimal, optional exponent)
const NUMBER_RE = /^-?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

// trim trailing zeros after decimal in mantissa, keep at least one digit
function trimMantissa(mantissa: string): string {
  if (!mantissa.includes('.')) return mantissa;
  return mantissa.replace(/\.?0+$/, '');
}

// format to scientific notation: Xe+Y with trimmed mantissa
function toScientific(n: number): string {
  const raw = n.toExponential();
  // raw is like "1.23450e-4" — split on 'e'
  const [mantissa, expPart] = raw.split('e');
  const exp = Number.parseInt(expPart, 10);
  const sign = exp >= 0 ? '+' : '';
  return `${trimMantissa(mantissa)}e${sign}${exp}`;
}

// format to engineering notation: exponent is a multiple of 3
function toEngineering(n: number): string {
  if (n === 0) return '0e+0';

  const exp = Math.floor(Math.log10(Math.abs(n)));
  // round down to nearest multiple of 3
  const engExp = Math.floor(exp / 3) * 3;
  const mantissa = n / 10 ** engExp;

  // round to avoid floating-point noise (up to 10 significant digits)
  const mantissaRounded = Number.parseFloat(mantissa.toPrecision(10));
  const sign = engExp >= 0 ? '+' : '';
  return `${trimMantissa(mantissaRounded.toString())}e${sign}${engExp}`;
}

// produce a plain decimal string without JS auto-exponent notation
function toDecimal(n: number): string {
  // Number.toString() uses exponent for very large/small values;
  // toFixed loses precision for very large numbers, so use a threshold approach
  const abs = Math.abs(n);
  if (abs === 0) return '0';
  // for numbers JS would render in exponent form natively (< 1e-6 or >= 1e21),
  // reconstruct from toExponential to get full decimal expansion
  if (abs < 1e-6 || abs >= 1e21) {
    const [mantissa, expPart] = n.toExponential().split('e');
    const exp = Number.parseInt(expPart, 10);
    const digits = mantissa.replace('-', '').replace('.', '');
    const isNeg = n < 0;
    const dotPos = 1 + exp; // position of decimal point in digits
    let result: string;
    if (dotPos <= 0) {
      result = `0.${'0'.repeat(-dotPos)}${digits}`;
    } else if (dotPos >= digits.length) {
      result = digits + '0'.repeat(dotPos - digits.length);
    } else {
      result = `${digits.slice(0, dotPos)}.${digits.slice(dotPos)}`;
    }
    return isNeg ? `-${result}` : result;
  }
  // for normal range, toString() is fine
  return n.toString();
}

export const ScientificNotationBoxSource = {
  name: 'Scientific Notation',
  description: 'Convert a number to/from scientific and engineering notation.',
  defaultInput: '0.00012345 ::scinote',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'scinote', 'scientific')) return [];

    const raw = trim(input).slice(0, 100);

    if (!NUMBER_RE.test(raw)) {
      const box = new BoxBuilder(
        'Scientific Notation',
        'A valid number is required (e.g. 0.00012345 or 1.5e-3).',
      )
        .setPriority(this.priority)
        .setTemplate(KeyValueBoxTemplate)
        .build();
      return [box];
    }

    const n = Number.parseFloat(raw);

    if (!Number.isFinite(n)) {
      const box = new BoxBuilder(
        'Scientific Notation',
        'A valid finite number is required.',
      )
        .setPriority(this.priority)
        .setTemplate(KeyValueBoxTemplate)
        .build();
      return [box];
    }

    const decimal = toDecimal(n);
    const scientific = toScientific(n);
    const engineering = toEngineering(n);
    const eNotation = scientific.toUpperCase();

    // plaintext output is a k:v block for KeyValueBoxTemplate fallback rendering
    const plaintext = `Decimal: ${decimal}\nScientific: ${scientific}\nEngineering: ${engineering}\nE-notation: ${eNotation}`;

    const box = new BoxBuilder('Scientific Notation', plaintext)
      .setOptions({
        Decimal: decimal,
        Scientific: scientific,
        Engineering: engineering,
        'E-notation': eNotation,
      })
      .setTemplate(KeyValueBoxTemplate)
      .setPriority(this.priority)
      .build();

    return [box];
  },
};

export default ScientificNotationBoxSource;
