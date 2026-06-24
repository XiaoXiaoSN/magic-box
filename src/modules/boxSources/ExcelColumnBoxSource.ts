import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// max column number supported (roughly 3-letter ZZZ = 18278; allow generous cap)
const MAX_COL_NUMBER = 1_000_000_000;
// 11 'Z's = 3.8e15 < Number.MAX_SAFE_INTEGER (9e15); 12+ would overflow to an
// imprecise float and stop round-tripping, so cap the letter length here
const MAX_COL_LETTERS_LEN = 11;

// bijective base-26: A=1 … Z=26, AA=27, AB=28, ZZ=702, AAA=703
function lettersToNumber(letters: string): number {
  const upper = letters.toUpperCase();
  let num = 0;
  for (let i = 0; i < upper.length; i++) {
    num = num * 26 + (upper.charCodeAt(i) - 64);
  }
  return num;
}

// inverse of bijective base-26
function numberToLetters(n: number): string {
  let result = '';
  let remaining = n;
  while (remaining > 0) {
    const rem = (remaining - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    remaining = Math.floor((remaining - 1) / 26);
  }
  return result;
}

// build plaintext output "Column: AB\nNumber: 28" for kvToPlaintext
function kvToPlaintext(column: string, number: number): string {
  return `Column: ${column}\nNumber: ${number}`;
}

export const ExcelColumnBoxSource = {
  defaultDisabled: true,
  name: 'Spreadsheet Column',
  description:
    'Convert a spreadsheet column letter to its number and back (A=1, AA=27).',
  defaultInput: 'AB ::excelcol',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'excelcol', 'spreadsheetcol')) return [];

    const trimmed = trim(input);

    if (/^[A-Za-z]+$/.test(trimmed)) {
      // guard against absurdly long letter strings
      if (trimmed.length > MAX_COL_LETTERS_LEN) return [];

      const column = trimmed.toUpperCase();
      const number = lettersToNumber(column);
      return [
        new BoxBuilder('Spreadsheet Column', kvToPlaintext(column, number))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions({ Column: column, Number: String(number) })
          .setPriority(this.priority)
          .build(),
      ];
    }

    if (/^\d+$/.test(trimmed)) {
      const n = Number.parseInt(trimmed, 10);
      if (n < 1 || n > MAX_COL_NUMBER) {
        return [
          new BoxBuilder(
            'Spreadsheet Column',
            'Number out of range (must be 1 – 1,000,000,000).',
          )
            .setTemplate(KeyValueBoxTemplate)
            .setOptions({
              Column: '',
              Number: 'out of range',
            })
            .setPriority(this.priority)
            .build(),
        ];
      }

      const column = numberToLetters(n);
      return [
        new BoxBuilder('Spreadsheet Column', kvToPlaintext(column, n))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions({ Column: column, Number: String(n) })
          .setPriority(this.priority)
          .build(),
      ];
    }

    // mixed or unrecognised input — return an explanatory box
    return [
      new BoxBuilder(
        'Spreadsheet Column',
        'Enter column letters (e.g. AB) or a column number.',
      )
        .setTemplate(KeyValueBoxTemplate)
        .setOptions({ Column: '', Number: '' })
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default ExcelColumnBoxSource;
