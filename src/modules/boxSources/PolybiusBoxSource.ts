import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// 5x5 grid, row-major; I and J share cell — J is excluded, mapped to I before lookup
const SQUARE = 'ABCDEFGHIKLMNOPQRSTUVWXYZ'; // 25 chars, no 'J'

/** encodes a single letter to its two-digit Polybius coordinate string */
function encodeChar(ch: string): string {
  const normalized = ch === 'J' ? 'I' : ch;
  const idx = SQUARE.indexOf(normalized);
  if (idx === -1) return '';
  const row = Math.floor(idx / 5) + 1;
  const col = (idx % 5) + 1;
  return `${row}${col}`;
}

/** encodes plaintext to space-separated Polybius pairs, dropping non-letters */
function encode(input: string): string {
  const pairs: string[] = [];
  for (const ch of input.toUpperCase()) {
    const pair = encodeChar(ch);
    if (pair !== '') {
      pairs.push(pair);
    }
  }
  return pairs.join(' ');
}

/** decodes space-separated Polybius pairs back to uppercase letters; invalid pair → '?' */
function decode(input: string): string {
  const tokens = input.trim().split(/\s+/);
  return tokens
    .map((token) => {
      if (token.length !== 2) return '?';
      const row = Number.parseInt(token[0], 10);
      const col = Number.parseInt(token[1], 10);
      if (
        Number.isNaN(row) ||
        Number.isNaN(col) ||
        row < 1 ||
        row > 5 ||
        col < 1 ||
        col > 5
      ) {
        return '?';
      }
      const idx = (row - 1) * 5 + (col - 1);
      return SQUARE[idx] ?? '?';
    })
    .join('');
}

export const PolybiusBoxSource = {
  defaultDisabled: true,
  name: 'Polybius Square',
  description:
    'Polybius square cipher (5x5, I/J combined). ::polybius to encode; ::polybiusdecode to decode.',
  defaultInput: 'HELLO ::polybius',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantEncode = hasOptionKeys(options, 'polybius', 'polybiusencode');
    const wantDecode = hasOptionKeys(options, 'polybiusdecode');
    if (!wantEncode && !wantDecode) return [];
    if (
      !isString(input) ||
      trim(input).length === 0 ||
      input.length > MAX_INPUT
    )
      return [];

    const boxes: Box[] = [];

    if (wantEncode) {
      const encoded = encode(input);
      boxes.push(
        new BoxBuilder('Polybius Square (Encode)', encoded)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    if (wantDecode) {
      const decoded = decode(input);
      boxes.push(
        new BoxBuilder('Polybius Square (Decode)', decoded)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    return boxes;
  },
};

export default PolybiusBoxSource;
