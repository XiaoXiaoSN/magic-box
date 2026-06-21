import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// escapes chars outside printable ASCII (code < 0x20 or > 0x7e) to \uXXXX;
// iterates by UTF-16 code unit so astral chars emit their surrogate pair.
function escapeUnicode(input: string): string {
  let result = '';
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code < 0x20 || code > 0x7e) {
      result += `\\u${code.toString(16).padStart(4, '0')}`;
    } else {
      result += input[i];
    }
  }
  return result;
}

// the regex handles both \u{HEX} (Unicode code point escape) and \uXXXX (UTF-16 code unit escape).
const UNESCAPE_RE = /\\u\{([0-9a-fA-F]{1,6})\}|\\u([0-9a-fA-F]{4})/g;

function unescapeUnicode(input: string): string {
  return input.replace(UNESCAPE_RE, (match, codePoint, codeUnit) => {
    if (codePoint !== undefined) {
      const cp = Number.parseInt(codePoint, 16);
      // guard against invalid code points
      if (cp > 0x10ffff) return match;
      return String.fromCodePoint(cp);
    }
    // codeUnit is always defined when codePoint is not
    return String.fromCharCode(Number.parseInt(codeUnit, 16));
  });
}

export const UnicodeEscapeBoxSource = {
  name: 'Unicode Escape',
  description:
    'Escape text to \\uXXXX sequences, or unescape them back to text.',
  defaultInput: 'café 😀 ::unicodeescape',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantEscape = hasOptionKeys(options, 'unicodeescape', 'uescape');
    const wantUnescape = hasOptionKeys(options, 'unicodeunescape', 'uunescape');
    if (!wantEscape && !wantUnescape) return [];
    if (!isString(input) || input.length > MAX_INPUT) return [];

    const boxes: Box[] = [];

    if (wantEscape) {
      boxes.push(
        new BoxBuilder('Unicode Escape (Escape)', escapeUnicode(input))
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    if (wantUnescape) {
      boxes.push(
        new BoxBuilder('Unicode Escape (Unescape)', unescapeUnicode(input))
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    return boxes;
  },
};

export default UnicodeEscapeBoxSource;
