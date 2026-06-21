import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// maps each character to its ITU-R M.1677-1 morse representation
const CHAR_TO_MORSE: Record<string, string> = {
  A: '.-',
  B: '-...',
  C: '-.-.',
  D: '-..',
  E: '.',
  F: '..-.',
  G: '--.',
  H: '....',
  I: '..',
  J: '.---',
  K: '-.-',
  L: '.-..',
  M: '--',
  N: '-.',
  O: '---',
  P: '.--.',
  Q: '--.-',
  R: '.-.',
  S: '...',
  T: '-',
  U: '..-',
  V: '...-',
  W: '.--',
  X: '-..-',
  Y: '-.--',
  Z: '--..',
  '0': '-----',
  '1': '.----',
  '2': '..---',
  '3': '...--',
  '4': '....-',
  '5': '.....',
  '6': '-....',
  '7': '--...',
  '8': '---..',
  '9': '----.',
  '.': '.-.-.-',
  ',': '--..--',
  '?': '..--..',
  "'": '.----.',
  '!': '-.-.--',
  '/': '-..-.',
  '(': '-.--.',
  ')': '-.--.-',
  '&': '.-...',
  ':': '---...',
  ';': '-.-.-.',
  '=': '-...-',
  '+': '.-.-.',
  '-': '-....-',
  _: '..--.-',
  '"': '.-..-.',
  $: '...-..-',
  '@': '.--.-.',
};

// invert CHAR_TO_MORSE for decoding
const MORSE_TO_CHAR: Record<string, string> = Object.fromEntries(
  Object.entries(CHAR_TO_MORSE).map(([ch, code]) => [code, ch]),
);

// encode plaintext to morse; words separated by ' / ', letters by ' '
function encodeMorse(input: string): string {
  return input
    .toUpperCase()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) =>
      word
        .split('')
        .map((ch) => CHAR_TO_MORSE[ch] ?? '?')
        .join(' '),
    )
    .join(' / ');
}

// decode morse to plaintext; word groups separated by ' / ', codes by ' '
function decodeMorse(input: string): string {
  return input
    .split(' / ')
    .map((wordGroup) =>
      wordGroup
        .trim()
        .split(' ')
        .filter((code) => code.length > 0)
        .map((code) => MORSE_TO_CHAR[code] ?? '?')
        .join(''),
    )
    .join(' ');
}

export const MorseBoxSource = {
  name: 'Morse Code',
  description:
    'Encode text to International Morse code or decode Morse back to text.',
  defaultInput: 'SOS ::morse',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantEncode = hasOptionKeys(options, 'morse', 'morseencode');
    const wantDecode = hasOptionKeys(options, 'morsedecode');
    if (!wantEncode && !wantDecode) return [];
    if (
      !isString(input) ||
      trim(input).length === 0 ||
      input.length > MAX_INPUT
    )
      return [];

    const boxes: Box[] = [];

    if (wantEncode) {
      const encoded = encodeMorse(input);
      boxes.push(
        new BoxBuilder('Morse Code (Encode)', encoded)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    if (wantDecode) {
      const decoded = decodeMorse(input);
      boxes.push(
        new BoxBuilder('Morse Code (Decode)', decoded)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    return boxes;
  },
};

export default MorseBoxSource;
