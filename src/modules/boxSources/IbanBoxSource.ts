import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// regex for a structurally valid IBAN: 2 uppercase letters, 2 digits, then alphanumeric
const IBAN_PATTERN = /^[A-Z]{2}\d{2}[A-Z0-9]+$/;

// converts a letter to its numeric equivalent per ISO 7064 (A=10, B=11, ..., Z=35)
function letterToDigits(ch: string): string {
  return (ch.charCodeAt(0) - 55).toString();
}

// validates IBAN checksum via mod-97 using BigInt arithmetic on the full digit string
function validateMod97(iban: string): boolean {
  // rearrange: move first 4 chars to end, then convert letters to numeric strings
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged
    .split('')
    .map((ch) => (/[A-Z]/.test(ch) ? letterToDigits(ch) : ch))
    .join('');
  return BigInt(numeric) % 97n === 1n;
}

export const IbanBoxSource = {
  name: 'IBAN',
  description: 'Validate an IBAN (ISO 13616) using the mod-97 check.',
  defaultInput: 'GB82 WEST 1234 5698 7654 32 ::iban',
  tag: '#',
  kind: 'Validate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'iban')) return [];

    // strip spaces and uppercase
    const cleaned = trim(input).replace(/\s+/g, '').toUpperCase();

    // structural check: 2 letters, 2 digits, 1–30 alphanumeric chars (total 4–34)
    if (
      !IBAN_PATTERN.test(cleaned) ||
      cleaned.length < 4 ||
      cleaned.length > 34
    ) {
      return [];
    }

    const country = cleaned.slice(0, 2);
    const checkDigits = cleaned.slice(2, 4);
    const valid = validateMod97(cleaned);

    return [
      new BoxBuilder('IBAN', cleaned)
        .setOptions({
          IBAN: cleaned,
          Country: country,
          'Check Digits': checkDigits,
          Valid: valid.toString(),
        })
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default IbanBoxSource;
