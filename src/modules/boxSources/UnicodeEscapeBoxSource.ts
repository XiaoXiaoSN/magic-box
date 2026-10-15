import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const MAX_INPUT = 100_000;
const UNICODE_ESCAPE_REGEX = /\\u(?:\{([0-9a-fA-F]{1,6})\}|([0-9a-fA-F]{4}))/y;

// escape each UTF-16 code unit: keep printable ASCII (0x20–0x7e), \uXXXX everything else.
// astral chars (e.g. emoji) are naturally emitted as surrogate pairs (\uD800–\uDFFF).
function escapeUnicode(input: string): string {
  let result = '';
  for (let i = 0; i < input.length; i++) {
    const cp = input.charCodeAt(i);
    if (cp >= 0x20 && cp <= 0x7e) {
      result += input[i];
    } else {
      result += `\\u${cp.toString(16).padStart(4, '0')}`;
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
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
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
    return [
      new BoxBuilder('Unicode Unescape', unescaped)
        .setView('default')
        .setShowExpandButton(false)

        .build(),
    ];
  },
};

export default UnicodeEscapeBoxSource;
