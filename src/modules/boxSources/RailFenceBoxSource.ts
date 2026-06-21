import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;
const DEFAULT_RAILS = 3;
const MIN_RAILS = 2;
const MAX_RAILS = 1000;

// parse and clamp the rail count from an option value
function parseRails(value: string | boolean): number {
  if (typeof value === 'boolean') return DEFAULT_RAILS;
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return DEFAULT_RAILS;
  return Math.min(Math.max(n, MIN_RAILS), MAX_RAILS);
}

// build the zigzag row-index pattern for a given text length and rail count
function zigzagPattern(length: number, numRails: number): number[] {
  const pattern: number[] = [];
  let row = 0;
  let dir = 1;
  for (let i = 0; i < length; i++) {
    pattern.push(row);
    if (row === 0) dir = 1;
    else if (row === numRails - 1) dir = -1;
    row += dir;
  }
  return pattern;
}

function encode(text: string, numRails: number): string {
  const rails: string[][] = Array.from({ length: numRails }, () => []);
  const pattern = zigzagPattern(text.length, numRails);
  for (let i = 0; i < text.length; i++) {
    rails[pattern[i]].push(text[i]);
  }
  return rails.map((r) => r.join('')).join('');
}

function decode(cipher: string, numRails: number): string {
  const n = cipher.length;
  const pattern = zigzagPattern(n, numRails);

  // count how many characters land on each rail
  const counts = new Array<number>(numRails).fill(0);
  for (const r of pattern) counts[r]++;

  // slice the ciphertext into per-rail segments in read order
  const railStrings: string[] = [];
  let pos = 0;
  for (let i = 0; i < numRails; i++) {
    railStrings.push(cipher.slice(pos, pos + counts[i]));
    pos += counts[i];
  }

  // read characters back out in zigzag order
  const railCursors = new Array<number>(numRails).fill(0);
  let result = '';
  for (const r of pattern) {
    result += railStrings[r][railCursors[r]++];
  }
  return result;
}

export const RailFenceBoxSource = {
  name: 'Rail Fence',
  description:
    'Rail Fence (zigzag) transposition cipher. ::railfence=3 to encode with 3 rails; ::railfencedecode=3 to decode.',
  defaultInput: 'WEAREDISCOVEREDFLEEATONCE ::railfence=3',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (
      !hasOptionKeys(options, 'railfence', 'railfenceencode', 'railfencedecode')
    ) {
      return [];
    }
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT) {
      return [];
    }

    const encValue = extractOptionKeys(options, 'railfence', 'railfenceencode');
    const decValue = extractOptionKeys(options, 'railfencedecode');

    const boxes: Box[] = [];

    if (encValue !== null) {
      const numRails = parseRails(encValue);
      const encoded = encode(input, numRails);
      boxes.push(
        new BoxBuilder('Rail Fence (Encode)', encoded)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    if (decValue !== null) {
      const numRails = parseRails(decValue);
      const decoded = decode(input, numRails);
      boxes.push(
        new BoxBuilder('Rail Fence (Decode)', decoded)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    return boxes;
  },
};

export default RailFenceBoxSource;
