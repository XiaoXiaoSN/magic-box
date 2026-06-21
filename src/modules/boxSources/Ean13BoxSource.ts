import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

type BarcodeType = 'EAN-13' | 'UPC-A' | 'EAN-8';

// compute the check digit for a barcode's data digits (all but the last).
// iterates from right-to-left, alternating weights 3, 1, 3, 1, ...
// this single algorithm works uniformly for EAN-8, EAN-13, and UPC-A.
function computeCheckDigit(dataDigits: string): number {
  let sum = 0;
  for (let i = dataDigits.length - 1; i >= 0; i--) {
    const weight = (dataDigits.length - 1 - i) % 2 === 0 ? 3 : 1;
    sum += Number.parseInt(dataDigits[i], 10) * weight;
  }
  return (10 - (sum % 10)) % 10;
}

function detectType(len: number): BarcodeType | null {
  if (len === 13) return 'EAN-13';
  if (len === 12) return 'UPC-A';
  if (len === 8) return 'EAN-8';
  return null;
}

export const Ean13BoxSource = {
  name: 'EAN-13 / UPC-A',
  description:
    'Validate an EAN-13 or UPC-A barcode and compute its check digit.',
  defaultInput: '4006381333931 ::ean13',
  tag: '#',
  kind: 'Validate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'ean13', 'ean', 'upc')) return [];

    // strip surrounding whitespace, then remove embedded spaces and hyphens
    const cleaned = trim(input).replace(/[\s-]/g, '');

    if (!/^\d+$/.test(cleaned)) {
      const output: Record<string, string> = {
        Input: cleaned,
        Error: 'input must contain digits only',
      };
      const plaintext = `Input: ${cleaned}\nError: input must contain digits only`;
      return [
        new BoxBuilder('EAN-13 / UPC-A', plaintext)
          .setOptions(output)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const barcodeType = detectType(cleaned.length);
    if (!barcodeType) {
      const output: Record<string, string> = {
        Input: cleaned,
        Error: `length must be 8 (EAN-8), 12 (UPC-A), or 13 (EAN-13); got ${cleaned.length}`,
      };
      const plaintext = `Input: ${cleaned}\nError: length must be 8 (EAN-8), 12 (UPC-A), or 13 (EAN-13); got ${cleaned.length}`;
      return [
        new BoxBuilder('EAN-13 / UPC-A', plaintext)
          .setOptions(output)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const dataDigits = cleaned.slice(0, -1);
    const providedCheck = Number.parseInt(cleaned[cleaned.length - 1], 10);
    const computedCheck = computeCheckDigit(dataDigits);
    const isValid = computedCheck === providedCheck;

    const output: Record<string, string> = {
      Input: cleaned,
      Type: barcodeType,
      Valid: String(isValid),
      'Check Digit': String(computedCheck),
    };
    const plaintext = Object.entries(output)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('EAN-13 / UPC-A', plaintext)
        .setOptions(output)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default Ean13BoxSource;
