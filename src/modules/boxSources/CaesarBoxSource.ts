import { CodeBoxTemplate, DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// shift a single character by n positions within a-z or A-Z; non-letters pass through unchanged
function shiftChar(char: string, n: number): string {
  const code = char.charCodeAt(0);
  if (code >= 65 && code <= 90) {
    return String.fromCharCode(((code - 65 + ((n % 26) + 26)) % 26) + 65);
  }
  if (code >= 97 && code <= 122) {
    return String.fromCharCode(((code - 97 + ((n % 26) + 26)) % 26) + 97);
  }
  return char;
}

function caesarShift(text: string, n: number): string {
  return text
    .split('')
    .map((c) => shiftChar(c, n))
    .join('');
}

export const CaesarBoxSource = {
  name: 'Caesar Cipher',
  description:
    'Caesar shift cipher. ::caesar=3 to shift by 3; ::caesarcrack to show all 25 shifts.',
  defaultInput: 'Hello ::caesar=3',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const shiftVal = extractOptionKeys(options, 'caesar');
    const wantCrack = hasOptionKeys(options, 'caesarcrack', 'caesarbrute');

    if (shiftVal === null && !wantCrack) return [];
    if (
      !isString(input) ||
      trim(input).length === 0 ||
      input.length > MAX_INPUT
    )
      return [];

    const boxes: Box[] = [];

    if (shiftVal !== null) {
      // parse the shift amount; fall back to 3 when the value is missing or non-numeric
      const n = Number.parseInt(String(shiftVal), 10);
      const parsedShift =
        typeof shiftVal === 'boolean' || Number.isNaN(n) ? 3 : n;

      const shifted = caesarShift(input, parsedShift);

      const box = new BoxBuilder('Caesar Cipher', shifted)
        .setPriority(Priority)
        .setTemplate(DefaultBoxTemplate)
        .setShowExpandButton(false)
        .build();

      boxes.push(box);
    }

    if (wantCrack) {
      // produce all 25 non-zero shifts, one per line
      const lines = Array.from({ length: 25 }, (_, i) => {
        const shift = i + 1;
        return `shift ${shift}: ${caesarShift(input, shift)}`;
      }).join('\n');

      const box = new BoxBuilder('Caesar Cipher (all shifts)', lines)
        .setPriority(Priority)
        .setTemplate(CodeBoxTemplate)
        .build();

      boxes.push(box);
    }

    return boxes;
  },
};

export default CaesarBoxSource;
