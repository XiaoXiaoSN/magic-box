import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// 5x5 polybius square, row-major, I/J merged (no J)
const SQUARE = 'ABCDEFGHIKLMNOPQRSTUVWXYZ';

// precompute char→index lookup for O(1) access
const CHAR_TO_IDX = new Map<string, number>(
  Array.from(SQUARE).map((ch, i) => [ch, i]),
);

/** normalizes plaintext: uppercase, J→I, keep only A-Z letters */
function preprocess(input: string): string {
  return input
    .toUpperCase()
    .replace(/J/g, 'I')
    .replace(/[^A-Z]/g, '');
}

/** enciphers a preprocessed (letters-only, no J) string using period-less Bifid */
function bifidEncode(plain: string): string {
  const n = plain.length;
  const rows: number[] = [];
  const cols: number[] = [];

  for (let i = 0; i < n; i++) {
    const idx = CHAR_TO_IDX.get(plain[i]) ?? 0;
    rows.push(Math.floor(idx / 5));
    cols.push(idx % 5);
  }

  // concatenate rows then cols, then read back in pairs
  const combined = [...rows, ...cols];
  let result = '';
  for (let i = 0; i < n; i++) {
    result += SQUARE[combined[2 * i] * 5 + combined[2 * i + 1]];
  }
  return result;
}

/** deciphers a Bifid ciphertext (period-less, same square) */
function bifidDecode(cipher: string): string {
  const n = cipher.length;
  // flatten cipher coords into a 2N sequence: r0,c0,r1,c1,...
  const flat: number[] = [];
  for (let i = 0; i < n; i++) {
    const idx = CHAR_TO_IDX.get(cipher[i]) ?? 0;
    flat.push(Math.floor(idx / 5));
    flat.push(idx % 5);
  }

  // first half = original rows, second half = original cols
  const rows = flat.slice(0, n);
  const cols = flat.slice(n);

  let result = '';
  for (let i = 0; i < n; i++) {
    result += SQUARE[rows[i] * 5 + cols[i]];
  }
  return result;
}

export const BifidBoxSource = {
  name: 'Bifid Cipher',
  description:
    'Bifid cipher (5x5 Polybius, I/J merged). ::bifid to encrypt, ::bifiddecode to decrypt.',
  defaultInput: 'FLEEATONCE ::bifid',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantEncode = hasOptionKeys(options, 'bifid', 'bifidencode');
    const wantDecode = hasOptionKeys(options, 'bifiddecode');
    if (!wantEncode && !wantDecode) return [];
    if (
      !isString(input) ||
      trim(input).length === 0 ||
      input.length > MAX_INPUT
    )
      return [];

    const normalized = preprocess(input);
    if (normalized.length === 0) return [];

    const boxes: Box[] = [];

    if (wantEncode) {
      const ciphertext = bifidEncode(normalized);
      boxes.push(
        new BoxBuilder('Bifid Cipher (Encrypt)', ciphertext)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(Priority)
          .build(),
      );
    }

    if (wantDecode) {
      const plaintext = bifidDecode(normalized);
      boxes.push(
        new BoxBuilder('Bifid Cipher (Decrypt)', plaintext)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(Priority)
          .build(),
      );
    }

    return boxes;
  },
};

export default BifidBoxSource;
