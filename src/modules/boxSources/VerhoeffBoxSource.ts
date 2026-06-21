import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// d = multiplication table (dihedral group D5)
const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

// p = permutation table
const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

// inv = inverse table
const INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

// validate whether a digit string (including its check digit) is Verhoeff-valid
function verhoeffValidate(digits: number[]): boolean {
  let c = 0;
  const reversed = [...digits].reverse();
  for (let i = 0; i < reversed.length; i++) {
    c = D[c][P[i % 8][reversed[i]]];
  }
  return c === 0;
}

// compute the check digit to append to the payload
function verhoeffCheckDigit(digits: number[]): number {
  let c = 0;
  const reversed = [...digits].reverse();
  for (let i = 0; i < reversed.length; i++) {
    c = D[c][P[(i + 1) % 8][reversed[i]]];
  }
  return INV[c];
}

export const VerhoeffBoxSource = {
  name: 'Verhoeff Check',
  description:
    'Compute a Verhoeff check digit for a number, or validate a number that already includes one.',
  defaultInput: '236 ::verhoeff',
  tag: '#',
  kind: 'Validate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'verhoeff')) return [];

    const cleaned = trim(input);

    // require pure digit input up to length 1000
    if (!/^\d+$/.test(cleaned) || cleaned.length > 1000) {
      const plaintextOutput = [
        `Input: ${cleaned}`,
        'Error: digits only (0-9), max length 1000',
      ].join('\n');

      const box = new BoxBuilder('Verhoeff Check', plaintextOutput)
        .setOptions({
          Input: cleaned,
          Error: 'digits only (0-9), max length 1000',
        })
        .setPriority(this.priority)
        .setTemplate(KeyValueBoxTemplate)
        .build();

      return [box];
    }

    const digits = cleaned.split('').map((d) => Number.parseInt(d, 10));
    const isValid = verhoeffValidate(digits);
    const checkDigit = verhoeffCheckDigit(digits);

    const kvOptions = {
      Input: cleaned,
      Valid: String(isValid),
      'Check Digit': String(checkDigit),
    };

    const plaintextOutput = Object.entries(kvOptions)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    const box = new BoxBuilder('Verhoeff Check', plaintextOutput)
      .setOptions(kvOptions)
      .setPriority(Priority)
      .setTemplate(KeyValueBoxTemplate)
      .build();

    return [box];
  },
};

export default VerhoeffBoxSource;
