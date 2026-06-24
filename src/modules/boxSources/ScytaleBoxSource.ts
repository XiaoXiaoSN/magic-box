import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys } from '@modules/Box';

const MAX_INPUT = 100_000;
const Priority = 10;

// scytale encrypt: write text row-by-row into N columns, read back column-by-column.
// handles irregular last row — only existing chars are included (no padding).
function scytaleEncrypt(text: string, cols: number): string {
  const len = text.length;
  const rows = Math.ceil(len / cols);
  let result = '';
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const idx = r * cols + c;
      if (idx < len) {
        result += text[idx];
      }
    }
  }
  return result;
}

// scytale decrypt: inverse of encrypt. given N cols, reconstruct column lengths
// then read row-major to recover original text.
function scytaleDecrypt(text: string, cols: number): string {
  const len = text.length;
  const rows = Math.ceil(len / cols);
  // columns in the last row that actually exist
  const extraCols = len % cols === 0 ? cols : len % cols;
  // first extraCols columns have `rows` chars; remaining cols have `rows - 1` chars
  const colLengths: number[] = Array.from({ length: cols }, (_, c) =>
    c < extraCols ? rows : rows - 1,
  );

  // distribute ciphertext back into columns
  const columns: string[] = [];
  let pos = 0;
  for (let c = 0; c < cols; c++) {
    columns.push(text.slice(pos, pos + colLengths[c]));
    pos += colLengths[c];
  }

  // read row-major
  let result = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r < columns[c].length) {
        result += columns[c][r];
      }
    }
  }
  return result;
}

function parseN(
  value: string | boolean | null,
  inputLen: number,
): number | null {
  if (value === null || value === true || value === false) return null;
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n) || n < 2) return null;
  // clamp N so it never exceeds input length, but reject a clamp below 2
  // (a 1-column scytale is an identity no-op, not a real cipher)
  const clamped = Math.min(n, inputLen);
  return clamped < 2 ? null : clamped;
}

function usageBox(priority: number): Box {
  return new BoxBuilder(
    'Scytale (Usage)',
    'Usage: ::scytale=N to encrypt, ::scytaledecode=N to decrypt. N must be an integer >= 2.',
  )
    .setPriority(priority)
    .setShowExpandButton(false)
    .setTemplate(DefaultBoxTemplate)
    .build();
}

export const ScytaleBoxSource = {
  defaultDisabled: true,
  name: 'Scytale',
  description:
    'Scytale transposition cipher. ::scytale=N to encrypt with N columns, ::scytaledecode=N to decrypt.',
  defaultInput: 'IAMHURTVERYBADLYHELP ::scytale=5',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const encVal = extractOptionKeys(options, 'scytale', 'scytaleencode');
    const decVal = extractOptionKeys(options, 'scytaledecode');

    if (encVal === null && decVal === null) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    const boxes: Box[] = [];

    if (encVal !== null) {
      const n = parseN(encVal as string | boolean, input.length);
      if (n === null) {
        boxes.push(usageBox(this.priority));
      } else {
        const encrypted = scytaleEncrypt(input, n);
        boxes.push(
          new BoxBuilder('Scytale (Encrypt)', encrypted)
            .setPriority(this.priority)
            .setShowExpandButton(false)
            .setTemplate(DefaultBoxTemplate)
            .build(),
        );
      }
    }

    if (decVal !== null) {
      const n = parseN(decVal as string | boolean, input.length);
      if (n === null) {
        boxes.push(usageBox(this.priority));
      } else {
        const decrypted = scytaleDecrypt(input, n);
        boxes.push(
          new BoxBuilder('Scytale (Decrypt)', decrypted)
            .setPriority(this.priority)
            .setShowExpandButton(false)
            .setTemplate(DefaultBoxTemplate)
            .build(),
        );
      }
    }

    return boxes;
  },
};

export default ScytaleBoxSource;
