import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const MAX_INPUT = 100_000;
// Each input code unit can expand to one fixed-width escape.
const MAX_ESCAPED_INPUT = MAX_INPUT * '\\u0000'.length;
const UNICODE_ESCAPE_REGEX = /\\u(?:\{([0-9a-fA-F]{1,6})\}|([0-9a-fA-F]{4}))/y;

// Double backslashes and preserve other printable ASCII (0x20–0x7e).
// Encode other UTF-16 code units as \uXXXX, including each half of surrogate pairs.
function escapeUnicode(input: string): string {
  let result = '';
  for (let i = 0; i < input.length; i++) {
    const character = input[i];
    const codeUnit = input.charCodeAt(i);
    if (character === '\\') {
      result += '\\\\';
    } else if (codeUnit >= 0x20 && codeUnit <= 0x7e) {
      result += character;
    } else {
      result += `\\u${codeUnit.toString(16).padStart(4, '0')}`;
    }
  }
  return result;
}

// unescape Unicode tokens once, while treating escaped backslashes as literal text.
function unescapeUnicode(input: string): string {
  let result = '';
  let index = 0;

  while (index < input.length) {
    if (input[index] !== '\\') {
      result += input[index];
      index += 1;
      continue;
    }

    if (input[index + 1] === '\\') {
      result += '\\';
      index += 2;
      continue;
    }

    UNICODE_ESCAPE_REGEX.lastIndex = index;
    const match = UNICODE_ESCAPE_REGEX.exec(input);
    if (match?.index === index) {
      const hex = match[1] ?? match[2];
      const cp = Number.parseInt(hex, 16);
      if (match[1] !== undefined && cp <= 0x10ffff) {
        result += String.fromCodePoint(cp);
      } else if (match[1] === undefined) {
        result += String.fromCharCode(cp);
      } else {
        result += match[0];
      }
      index += match[0].length;
      continue;
    }

    result += input[index];
    index += 1;
  }

  return result;
}

export const UnicodeEscapeBoxSource = {
  defaultDisabled: true,
  name: 'Unicode Escape',
  description:
    'Escape text to \\uXXXX sequences, or unescape \\uXXXX / \\u{...} back to text.',
  defaultInput: 'héllo 😀\n::unicodeescape',
  tag: '#',
  kind: 'Encode',

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantEscape = hasOptionKeys(options, 'unicodeescape', 'uescape');
    const wantUnescape = hasOptionKeys(options, 'unicodeunescape', 'uunescape');
    if (!wantEscape && !wantUnescape) return [];
    const maxLength = wantEscape ? MAX_INPUT : MAX_ESCAPED_INPUT;
    if (!isString(input) || input.length === 0 || input.length > maxLength)
      return [];

    if (wantEscape) {
      const escaped = escapeUnicode(input);
      return [
        new BoxBuilder('Unicode Escape', escaped)
          .setView('default')
          .setShowExpandButton(false)

          .build(),
      ];
    }

    // wantUnescape
    const unescaped = unescapeUnicode(input);
    if (unescaped.length > MAX_INPUT) return [];
    return [
      new BoxBuilder('Unicode Unescape', unescaped)
        .setView('default')
        .setShowExpandButton(false)

        .build(),
    ];
  },
};

export default UnicodeEscapeBoxSource;
