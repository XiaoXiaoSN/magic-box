import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys } from '@modules/Box';

const MAX_INPUT = 100_000;
const Priority = 10;

// returns the original column indices in the order they should be read during
// encryption: sort key chars alphabetically (stable), extract their original positions.
// e.g. ZEBRAS → sorted [A(4),B(2),E(1),R(3),S(5),Z(0)] → [4,2,1,3,5,0]
function getColumnOrder(key: string): number[] {
  const pairs = [...key].map((c, i) => [c, i] as [string, number]);
  pairs.sort((a, b) => a[0].localeCompare(b[0]) || a[1] - b[1]);
  return pairs.map(([, i]) => i);
}

// writes plaintext row-by-row into keyLen columns, then reads columns in sorted
// key order. columns with grid index < (msgLen % keyLen) are one row taller than
// the rest (standard row-major fill, no padding).
function columnarEncrypt(plaintext: string, key: string): string {
  const msg = plaintext.replace(/\s/g, '');
  const k = key.length;
  if (k === 0) return msg;

  const colOrder = getColumnOrder(key);
  const n = msg.length;
  const numRows = Math.ceil(n / k);
  const extra = n % k; // leftmost `extra` grid columns each have one extra row

  let result = '';
  for (const col of colOrder) {
    const colLen = extra === 0 ? numRows : col < extra ? numRows : numRows - 1;
    for (let row = 0; row < colLen; row++) {
      result += msg[row * k + col];
    }
  }
  return result;
}

// inverse of columnarEncrypt: given ciphertext and key, reconstructs the grid by
// filling each grid column (in key-sorted reading order) from the ciphertext chunks,
// then reads back row-by-row to recover the plaintext.
function columnarDecrypt(ciphertext: string, key: string): string {
  const k = key.length;
  if (k === 0) return ciphertext;

  const colOrder = getColumnOrder(key);
  const n = ciphertext.length;
  const numRows = Math.ceil(n / k);
  const extra = n % k;

  // length of each grid column (same irregular-column rule as encryption)
  const colLens = Array.from({ length: k }, (_, col) =>
    extra === 0 ? numRows : col < extra ? numRows : numRows - 1,
  );

  // distribute ciphertext chunks back into the grid columns in reading order
  const grid: string[][] = Array.from({ length: k }, () => []);
  let pos = 0;
  for (const col of colOrder) {
    grid[col] = [...ciphertext.slice(pos, pos + colLens[col])];
    pos += colLens[col];
  }

  // read row-by-row to reconstruct plaintext
  let result = '';
  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < k; col++) {
      if (row < grid[col].length) {
        result += grid[col][row];
      }
    }
  }
  return result;
}

function usageBox(priority: number): Box {
  return new BoxBuilder(
    'Columnar Transposition (Usage)',
    'Usage: ::columnar=KEY to encrypt, ::columnardecode=KEY to decrypt. KEY must be a non-empty string.',
  )
    .setPriority(priority)
    .setShowExpandButton(false)
    .setTemplate(DefaultBoxTemplate)
    .build();
}

export const ColumnarTranspositionBoxSource = {
  name: 'Columnar Transposition',
  description:
    'Columnar transposition cipher. ::columnar=KEY to encrypt, ::columnardecode=KEY to decrypt.',
  defaultInput: 'WEAREDISCOVEREDFLEEATONCE ::columnar=ZEBRAS',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const encVal = extractOptionKeys(options, 'columnar', 'columnarencode');
    const decVal = extractOptionKeys(options, 'columnardecode');

    if (encVal === null && decVal === null) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT) {
      return [];
    }

    const boxes: Box[] = [];

    if (encVal !== null) {
      if (typeof encVal !== 'string' || encVal.length === 0) {
        boxes.push(usageBox(this.priority));
      } else {
        const encrypted = columnarEncrypt(input, encVal);
        boxes.push(
          new BoxBuilder('Columnar Transposition (Encrypt)', encrypted)
            .setPriority(this.priority)
            .setShowExpandButton(false)
            .setTemplate(DefaultBoxTemplate)
            .build(),
        );
      }
    }

    if (decVal !== null) {
      if (typeof decVal !== 'string' || decVal.length === 0) {
        boxes.push(usageBox(this.priority));
      } else {
        const decrypted = columnarDecrypt(input, decVal);
        boxes.push(
          new BoxBuilder('Columnar Transposition (Decrypt)', decrypted)
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

export default ColumnarTranspositionBoxSource;
