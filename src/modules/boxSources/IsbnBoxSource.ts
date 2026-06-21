import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// strip hyphens and spaces from raw isbn input
function cleanIsbn(raw: string): string {
  return raw.replace(/[-\s]/g, '');
}

// compute the expected isbn-10 check digit for the first 9 digits
function computeIsbn10Check(digits: string): string {
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number.parseInt(digits[i], 10) * (10 - i);
  }
  const remainder = (11 - (sum % 11)) % 11;
  return remainder === 10 ? 'X' : String(remainder);
}

// compute the expected isbn-13 check digit for the first 12 digits
function computeIsbn13Check(digits: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number.parseInt(digits[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  const remainder = (10 - (sum % 10)) % 10;
  return String(remainder);
}

// validate and describe an isbn string, returning null if input is unusable
function analyzeIsbn(cleaned: string): {
  type: string;
  valid: boolean;
  checkDigit: string;
} | null {
  const len = cleaned.length;

  if (len === 10) {
    // last char may be 'X' (represents 10); all others must be digits
    const body = cleaned.slice(0, 9);
    const last = cleaned[9].toUpperCase();
    if (!/^\d{9}$/.test(body) || !/^[\dX]$/.test(last)) return null;

    const expectedCheck = computeIsbn10Check(body);
    const actualValue = last === 'X' ? 10 : Number.parseInt(last, 10);
    const expectedValue =
      expectedCheck === 'X' ? 10 : Number.parseInt(expectedCheck, 10);
    const valid = actualValue === expectedValue;

    return { type: 'ISBN-10', valid, checkDigit: expectedCheck };
  }

  if (len === 13) {
    if (!/^\d{13}$/.test(cleaned)) return null;

    const expectedCheck = computeIsbn13Check(cleaned);
    const valid = cleaned[12] === expectedCheck;

    return { type: 'ISBN-13', valid, checkDigit: expectedCheck };
  }

  return null;
}

export const IsbnBoxSource = {
  name: 'ISBN',
  description:
    'Validate an ISBN-10 or ISBN-13 and show its type and check digit.',
  defaultInput: '978-0-306-40615-7 ::isbn',
  tag: '#',
  kind: 'Validate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'isbn')) return [];

    const cleaned = cleanIsbn(trim(input));
    const result = analyzeIsbn(cleaned);
    if (!result) return [];

    const kv: Record<string, string> = {
      ISBN: cleaned,
      Type: result.type,
      Valid: String(result.valid),
      'Check Digit': result.checkDigit,
    };

    const box = new BoxBuilder('ISBN', cleaned)
      .setTemplate(KeyValueBoxTemplate)
      .setOptions(kv)
      .setPriority(Priority)
      .build();

    return [box];
  },
};

export default IsbnBoxSource;
