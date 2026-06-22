import { CodeBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 10_000;

const NATO: Record<string, string> = {
  a: 'Alfa',
  b: 'Bravo',
  c: 'Charlie',
  d: 'Delta',
  e: 'Echo',
  f: 'Foxtrot',
  g: 'Golf',
  h: 'Hotel',
  i: 'India',
  j: 'Juliett',
  k: 'Kilo',
  l: 'Lima',
  m: 'Mike',
  n: 'November',
  o: 'Oscar',
  p: 'Papa',
  q: 'Quebec',
  r: 'Romeo',
  s: 'Sierra',
  t: 'Tango',
  u: 'Uniform',
  v: 'Victor',
  w: 'Whiskey',
  x: 'X-ray',
  y: 'Yankee',
  z: 'Zulu',
  '0': 'Zero',
  '1': 'One',
  '2': 'Two',
  '3': 'Three',
  '4': 'Four',
  '5': 'Five',
  '6': 'Six',
  '7': 'Seven',
  '8': 'Eight',
  '9': 'Nine',
};

// reverse map: lowercase nato word → original char (uppercase letter or digit)
const NATO_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(NATO).map(([char, word]) => [
    word.toLowerCase(),
    char === char.toUpperCase() ? char : char.toUpperCase(),
  ]),
);

function encodeNato(input: string): string {
  const tokens: string[] = [];
  for (const ch of input) {
    const lower = ch.toLowerCase();
    if (lower === ' ') {
      tokens.push('(space)');
    } else if (NATO[lower] !== undefined) {
      tokens.push(NATO[lower]);
    } else {
      tokens.push(ch);
    }
  }
  return tokens.join(' ');
}

function decodeNato(input: string): string {
  const tokens = input.trim().split(/\s+/);
  const result: string[] = [];
  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (lower === '(space)') {
      result.push(' ');
    } else if (NATO_REVERSE[lower] !== undefined) {
      result.push(NATO_REVERSE[lower]);
    } else {
      result.push(token);
    }
  }
  return result.join('');
}

export const NatoPhoneticBoxSource = {
  name: 'NATO Phonetic',
  description:
    'Spell text in the NATO phonetic alphabet (Alfa Bravo Charlie). ::nato to encode, ::natodecode to decode.',
  defaultInput: 'ABC ::nato',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantEncode = hasOptionKeys(options, 'nato', 'natoencode', 'phonetic');
    const wantDecode = hasOptionKeys(options, 'natodecode');
    if (!wantEncode && !wantDecode) return [];
    if (
      !isString(input) ||
      trim(input).length === 0 ||
      input.length > MAX_INPUT
    )
      return [];

    const boxes: Box[] = [];

    if (wantEncode) {
      const encoded = encodeNato(input);
      boxes.push(
        new BoxBuilder('NATO Phonetic (Encode)', encoded)
          .setTemplate(CodeBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    if (wantDecode) {
      const decoded = decodeNato(input);
      boxes.push(
        new BoxBuilder('NATO Phonetic (Decode)', decoded)
          .setTemplate(CodeBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    return boxes;
  },
};

export default NatoPhoneticBoxSource;
