import { DefaultBoxTemplate } from '@components/BoxTemplate';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// ITU-R M.1677-1 standard Morse code table
const MORSE_ENCODE: Record<string, string> = {
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

// reverse map for decoding
const MORSE_DECODE: Record<string, string> = Object.fromEntries(
  Object.entries(MORSE_ENCODE).map(([char, code]) => [code, char]),
);

/** encodes a plain-text string to Morse code. words are separated by ` / `, letters by ` `. */
function encode(text: string): string {
  const words = text.toUpperCase().split(/\s+/).filter(Boolean);
  return words
    .map((word) =>
      word
        .split('')
        .map((ch) => MORSE_ENCODE[ch])
        .filter(Boolean)
        .join(' '),
    )
    .filter(Boolean)
    .join(' / ');
}

/** decodes a Morse code string back to plain text. words split on ` / `, symbols on space. */
function decode(morse: string): string {
  return morse
    .split(' / ')
    .map((word) =>
      word
        .trim()
        .split(' ')
        .map((sym) => MORSE_DECODE[sym] ?? '')
        .join(''),
    )
    .join(' ');
}

export const MorseCodeBoxSource = {
  name: 'Morse Code',
  description: 'Encode text to Morse code or decode Morse code back to text.',
  defaultInput: 'SOS ::morse',
  tag: '·',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantEncode = hasOptionKeys(options, 'morse', 'morseencode');
    const wantDecode = hasOptionKeys(options, 'morsedecode');
    if (!wantEncode && !wantDecode) return [];

    const boxes: Box[] = [];

    if (wantEncode) {
      boxes.push(
        new BoxBuilder('Morse Code (Encode)', encode(input))
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(Priority)
          .build(),
      );
    }

    if (wantDecode) {
      boxes.push(
        new BoxBuilder('Morse Code (Decode)', decode(input))
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(Priority)
          .build(),
      );
    }

    return boxes;
  },
};

export default MorseCodeBoxSource;
