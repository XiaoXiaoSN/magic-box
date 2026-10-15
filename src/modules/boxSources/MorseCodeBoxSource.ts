import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

// ITU-R M.1677-1 morse code table plus common non-standard extensions ($)
const MORSE_ENCODE = new Map<string, string>([
  ['A', '.-'],
  ['B', '-...'],
  ['C', '-.-.'],
  ['D', '-..'],
  ['E', '.'],
  ['F', '..-.'],
  ['G', '--.'],
  ['H', '....'],
  ['I', '..'],
  ['J', '.---'],
  ['K', '-.-'],
  ['L', '.-..'],
  ['M', '--'],
  ['N', '-.'],
  ['O', '---'],
  ['P', '.--.'],
  ['Q', '--.-'],
  ['R', '.-.'],
  ['S', '...'],
  ['T', '-'],
  ['U', '..-'],
  ['V', '...-'],
  ['W', '.--'],
  ['X', '-..-'],
  ['Y', '-.--'],
  ['Z', '--..'],
  ['0', '-----'],
  ['1', '.----'],
  ['2', '..---'],
  ['3', '...--'],
  ['4', '....-'],
  ['5', '.....'],
  ['6', '-....'],
  ['7', '--...'],
  ['8', '---..'],
  ['9', '----.'],
  ['.', '.-.-.-'],
  [',', '--..--'],
  ['?', '..--..'],
  ["'", '.----.'],
  ['!', '-.-.--'],
  ['/', '-..-.'],
  ['(', '-.--.'],
  [')', '-.--.-'],
  ['&', '.-...'],
  [':', '---...'],
  [';', '-.-.-.'],
  ['=', '-...-'],
  ['+', '.-.-.'],
  ['-', '-....-'],
  ['_', '..--.-'],
  ['"', '.-..-.'],
  ['$', '...-..-'],
  ['@', '.--.-.'],
]);

// reverse map for decoding
const MORSE_DECODE = new Map(
  [...MORSE_ENCODE].map(([char, code]) => [code, char]),
);

/** encodes a plain-text string to Morse code. words are separated by ` / `, letters by ` `. */
function encode(text: string): string {
  const normalizedText = text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase();
  const words = normalizedText.split(/\s+/).filter(Boolean);
  return words
    .map((word) =>
      word
        .split('')
        .map((ch) => MORSE_ENCODE.get(ch) ?? MORSE_ENCODE.get('?'))
        .filter((code): code is string => code !== undefined)
        .join(' '),
    )
    .filter(Boolean)
    .join(' / ');
}

/** decodes a Morse code string back to plain text. words split on ` / `, symbols on space. */
function decode(morse: string): string {
  const normalized = morse
    .replaceAll('…', '...')
    .replace(/[·•]/g, '.')
    .replace(/[−–—]/g, '-');
  return normalized
    .split(/\s*\/\s*|\n/)
    .map((word) =>
      word
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((sym) => MORSE_DECODE.get(sym) ?? '?')
        .join(''),
    )
    .join(' ');
}

export const MorseCodeBoxSource = {
  defaultDisabled: true,
  name: 'Morse Code',
  description: 'Encode text to Morse code or decode Morse code back to text.',
  defaultInput: 'SOS\n::morse',
  tag: '·',
  kind: 'Encode',

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
          .setView('default')
          .setShowExpandButton(false)

          .build(),
      );
    }

    if (wantDecode) {
      boxes.push(
        new BoxBuilder('Morse Code (Decode)', decode(input))
          .setView('default')
          .setShowExpandButton(false)

          .build(),
      );
    }

    return boxes;
  },
};

export default MorseCodeBoxSource;
