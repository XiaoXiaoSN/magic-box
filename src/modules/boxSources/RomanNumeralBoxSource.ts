import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// ordered pairs used for the standard subtractive algorithm
const ROMAN_TABLE: [number, string][] = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

// strict regex that only accepts valid subtractive-form roman numerals
const ROMAN_REGEX = /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;

function toRoman(n: number): string {
  let result = '';
  let remaining = n;
  for (const [value, numeral] of ROMAN_TABLE) {
    while (remaining >= value) {
      result += numeral;
      remaining -= value;
    }
  }
  return result;
}

function fromRoman(s: string): number {
  let result = 0;
  let i = 0;
  for (const [value, numeral] of ROMAN_TABLE) {
    while (s.startsWith(numeral, i)) {
      result += value;
      i += numeral.length;
    }
  }
  return result;
}

export const RomanNumeralBoxSource = {
  name: 'Roman Numeral',
  description:
    'Convert an integer (1-3999) to a Roman numeral, or a Roman numeral back to an integer.',
  defaultInput: '2024 ::roman',
  tag: 'Ⅼ',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'roman')) return [];

    const s = trim(input);

    if (/^[0-9]+$/.test(s)) {
      const n = Number.parseInt(s, 10);
      if (n < 1 || n > 3999) return [];
      const roman = toRoman(n);
      return [
        new BoxBuilder('Roman Numeral', roman)
          .setTemplate(DefaultBoxTemplate)
          .setPriority(Priority)
          .build(),
      ];
    }

    const upper = s.toUpperCase();
    // ensure the string is non-empty and matches valid subtractive form
    if (upper.length > 0 && ROMAN_REGEX.test(upper)) {
      const n = fromRoman(upper);
      if (n === 0) return [];
      return [
        new BoxBuilder('Roman Numeral', String(n))
          .setTemplate(DefaultBoxTemplate)
          .setPriority(Priority)
          .build(),
      ];
    }

    return [];
  },
};

export default RomanNumeralBoxSource;
