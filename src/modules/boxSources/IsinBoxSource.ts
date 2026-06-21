import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// ISIN format: 2-letter country code + 9 alphanumeric NSIN chars + 1 numeric check digit
const ISIN_REGEX = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

// expand each character: letters become their ISO 6166 numeric equivalent (A=10..Z=35),
// digits stay as single characters — concatenated into one digit string
function expandIsin(isin: string): string {
  let result = '';
  for (const ch of isin) {
    if (ch >= 'A' && ch <= 'Z') {
      result += String(ch.charCodeAt(0) - 55);
    } else {
      result += ch;
    }
  }
  return result;
}

// standard Luhn verification over the expanded digit string;
// returns true when the full string (including check digit) is valid
function luhnVerify(digits: string): boolean {
  let sum = 0;
  let shouldDouble = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number.parseInt(digits[i], 10);
    if (shouldDouble) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

// compute the expected check digit from the 11-char prefix;
// the check digit occupies position 0 from the right (not doubled), so the
// rightmost char of the 11-char expansion starts with shouldDouble = true
function computeCheckDigit(isin11: string): number {
  const expanded = expandIsin(isin11);
  let sum = 0;
  let shouldDouble = true;

  for (let i = expanded.length - 1; i >= 0; i--) {
    let d = Number.parseInt(expanded[i], 10);
    if (shouldDouble) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    shouldDouble = !shouldDouble;
  }

  return (10 - (sum % 10)) % 10;
}

export const IsinBoxSource = {
  name: 'ISIN',
  description: 'Validate an ISIN (ISO 6166) using its Luhn-based check digit.',
  defaultInput: 'US0378331005 ::isin',
  tag: '#',
  kind: 'Validate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'isin')) return [];

    const cleaned = trim(input).toUpperCase().replace(/\s/g, '');

    // if input doesn't match the ISIN format, return a box explaining the expected format
    if (!ISIN_REGEX.test(cleaned)) {
      const kvOptions: Record<string, string> = {
        ISIN: cleaned || '(empty)',
        Format: '2-letter country + 9 alphanumeric + 1 digit',
        Error: 'does not match ISIN format',
      };
      const plaintextOutput = Object.entries(kvOptions)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');

      return [
        new BoxBuilder('ISIN', plaintextOutput)
          .setOptions(kvOptions)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const country = cleaned.slice(0, 2);
    const nsin = cleaned.slice(2, 11);
    const computedCheckDigit = computeCheckDigit(cleaned.slice(0, 11));
    const isValid = luhnVerify(expandIsin(cleaned));

    const kvOptions: Record<string, string> = {
      ISIN: cleaned,
      Country: country,
      NSIN: nsin,
      Valid: String(isValid),
      'Check Digit': String(computedCheckDigit),
    };

    const plaintextOutput = Object.entries(kvOptions)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('ISIN', plaintextOutput)
        .setOptions(kvOptions)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default IsinBoxSource;
