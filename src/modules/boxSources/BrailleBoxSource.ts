import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// grade 1 english braille: each letter maps to a unicode braille cell.
// braille cell bitmask: dot1=1, dot2=2, dot3=4, dot4=8, dot5=16, dot6=32.
// unicode braille block starts at U+2800; char = U+2800 + bitmask.
const LETTER_TO_BRAILLE: ReadonlyMap<string, string> = new Map([
  ['a', '⠁'], // dot1
  ['b', '⠃'], // dots 1,2
  ['c', '⠉'], // dots 1,4
  ['d', '⠙'], // dots 1,4,5
  ['e', '⠑'], // dots 1,5
  ['f', '⠋'], // dots 1,2,4
  ['g', '⠛'], // dots 1,2,4,5
  ['h', '⠓'], // dots 1,2,5
  ['i', '⠊'], // dots 2,4
  ['j', '⠚'], // dots 2,4,5
  ['k', '⠅'], // dots 1,3
  ['l', '⠇'], // dots 1,2,3
  ['m', '⠍'], // dots 1,3,4
  ['n', '⠝'], // dots 1,3,4,5
  ['o', '⠕'], // dots 1,3,5
  ['p', '⠏'], // dots 1,2,3,4
  ['q', '⠟'], // dots 1,2,3,4,5
  ['r', '⠗'], // dots 1,2,3,5
  ['s', '⠎'], // dots 2,3,4
  ['t', '⠞'], // dots 2,3,4,5
  ['u', '⠥'], // dots 1,3,6
  ['v', '⠧'], // dots 1,2,3,6
  ['w', '⠺'], // dots 2,4,5,6
  ['x', '⠭'], // dots 1,3,4,6
  ['y', '⠽'], // dots 1,3,4,5,6
  ['z', '⠵'], // dots 1,3,5,6
  [' ', '⠀'], // blank braille cell for space
]);

// reverse map built once at module load
const BRAILLE_TO_LETTER: ReadonlyMap<string, string> = new Map(
  Array.from(LETTER_TO_BRAILLE.entries()).map(([letter, braille]) => [
    braille,
    letter,
  ]),
);

function encode(input: string): string {
  const lower = input.toLowerCase();
  let result = '';
  for (const ch of lower) {
    const braille = LETTER_TO_BRAILLE.get(ch);
    result += braille !== undefined ? braille : ch;
  }
  return result;
}

function decode(input: string): string {
  let result = '';
  for (const ch of input) {
    const letter = BRAILLE_TO_LETTER.get(ch);
    result += letter !== undefined ? letter : ch;
  }
  return result;
}

export const BrailleBoxSource = {
  name: 'Braille',
  description:
    'Convert text to Unicode Braille (Grade 1) or decode Braille back to text. ::braille to encode, ::brailledecode to decode.',
  defaultInput: 'hello ::braille',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantEncode = hasOptionKeys(options, 'braille', 'brailleencode');
    const wantDecode = hasOptionKeys(options, 'brailledecode');
    if (!wantEncode && !wantDecode) return [];
    if (
      !isString(input) ||
      trim(input).length === 0 ||
      input.length > MAX_INPUT
    )
      return [];

    const boxes: Box[] = [];

    if (wantEncode) {
      boxes.push(
        new BoxBuilder('Braille (Encode)', encode(input))
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    if (wantDecode) {
      boxes.push(
        new BoxBuilder('Braille (Decode)', decode(input))
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    return boxes;
  },
};

export default BrailleBoxSource;
