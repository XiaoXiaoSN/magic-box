import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// maps a single letter (a-z / A-Z) to its 1-26 position number
function letterToNumber(char: string): number {
  return char.toLowerCase().charCodeAt(0) - 96;
}

// maps a 1-26 number to its corresponding lowercase letter
function numberToLetter(n: number): string | null {
  if (n < 1 || n > 26) return null;
  return String.fromCharCode(96 + n);
}

// encodes a string using A1Z26: letters → numbers, whitespace → word boundary, others dropped
function encodeA1Z26(input: string): string {
  const words = input.split(/(\s+)/);
  const encodedWords: string[] = [];

  for (const segment of words) {
    if (/^\s+$/.test(segment)) {
      // preserve word boundaries as a single space
      encodedWords.push(' ');
      continue;
    }

    const parts: string[] = [];
    for (const char of segment) {
      if (/[a-zA-Z]/.test(char)) {
        parts.push(String(letterToNumber(char)));
      }
      // non-letter, non-space characters are dropped
    }

    if (parts.length > 0) {
      encodedWords.push(parts.join('-'));
    }
  }

  // collapse multiple spaces that arise from adjacent non-letter segments
  return encodedWords.join('').replace(/ +/g, ' ').trim();
}

// decodes A1Z26 encoded string: whitespace-separated groups of dash-separated numbers → letters
function decodeA1Z26(input: string): string {
  const words = input.trim().split(/\s+/);
  const decoded = words.map((word) => {
    const parts = word.split('-');
    return parts
      .map((part) => {
        const n = Number.parseInt(part, 10);
        if (Number.isNaN(n)) return '?';
        return numberToLetter(n) ?? '?';
      })
      .join('');
  });
  return decoded.join(' ');
}

export const A1Z26BoxSource = {
  defaultDisabled: true,
  name: 'A1Z26',
  description:
    'Encode letters to their position numbers (A=1..Z=26) or decode numbers back to letters.',
  defaultInput: 'hello ::a1z26',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantEncode = hasOptionKeys(options, 'a1z26', 'a1z26encode');
    const wantDecode = hasOptionKeys(options, 'a1z26decode');
    if (!wantEncode && !wantDecode) return [];
    if (
      !isString(input) ||
      trim(input).length === 0 ||
      input.length > MAX_INPUT
    )
      return [];

    const boxes: Box[] = [];

    if (wantEncode) {
      const encoded = encodeA1Z26(input);
      boxes.push(
        new BoxBuilder('A1Z26 (Encode)', encoded)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    if (wantDecode) {
      const decoded = decodeA1Z26(input);
      boxes.push(
        new BoxBuilder('A1Z26 (Decode)', decoded)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    return boxes;
  },
};

export default A1Z26BoxSource;
