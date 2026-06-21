import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

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

// unescape \u{XXXXX} (1–6 hex, cp <= 0x10ffff) and \uXXXX (exactly 4 hex) sequences.
// unrecognised text is passed through unchanged.
function unescapeUnicode(input: string): string {
  // replace braces form first so \u{...} does not conflict with the 4-hex pattern
  let result = input.replace(/\\u\{([0-9a-fA-F]{1,6})\}/g, (match, hex) => {
    const cp = Number.parseInt(hex, 16);
    if (cp > 0x10ffff) return match; // guard against invalid code point
    return String.fromCodePoint(cp);
  });

  result = result.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => {
    return String.fromCharCode(Number.parseInt(hex, 16));
  });

  return result;
}

export const UnicodeEscapeBoxSource = {
  name: 'Unicode Escape',
  description:
    'Escape text to \\uXXXX sequences, or unescape \\uXXXX / \\u{...} back to text.',
  defaultInput: 'héllo 😀 ::unicodeescape',
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
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    if (wantEscape) {
      const escaped = escapeUnicode(input);
      return [
        new BoxBuilder('Unicode Escape', escaped)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // wantUnescape
    const unescaped = unescapeUnicode(input);
    return [
      new BoxBuilder('Unicode Unescape', unescaped)
        .setTemplate(DefaultBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default UnicodeEscapeBoxSource;
