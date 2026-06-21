import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// c0 control character names (0-31 and 127)
const C0_NAMES: Record<number, string> = {
  0: 'NUL',
  1: 'SOH',
  2: 'STX',
  3: 'ETX',
  4: 'EOT',
  5: 'ENQ',
  6: 'ACK',
  7: 'BEL',
  8: 'BS',
  9: 'HT',
  10: 'LF',
  11: 'VT',
  12: 'FF',
  13: 'CR',
  14: 'SO',
  15: 'SI',
  16: 'DLE',
  17: 'DC1',
  18: 'DC2',
  19: 'DC3',
  20: 'DC4',
  21: 'NAK',
  22: 'SYN',
  23: 'ETB',
  24: 'CAN',
  25: 'EM',
  26: 'SUB',
  27: 'ESC',
  28: 'FS',
  29: 'GS',
  30: 'RS',
  31: 'US',
  127: 'DEL',
};

// build a single key:value plaintext string for copy
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

// resolve the display label for a code point's glyph
function glyphLabel(cp: number): string {
  const name = C0_NAMES[cp];
  if (name != null) return `(${name})`;
  return String.fromCodePoint(cp);
}

// try to parse the trimmed input as a code point number; returns -1 on failure
function parseCodePoint(s: string): number {
  if (/^\d+$/.test(s)) return Number.parseInt(s, 10);
  // strip the radix prefix: parseInt('0b101', 2) reads only the leading 0 then
  // stops at 'b', so the 0b/0o/0x prefix must be removed before parsing
  if (/^0x[0-9a-f]+$/i.test(s)) return Number.parseInt(s.slice(2), 16);
  if (/^0b[01]+$/i.test(s)) return Number.parseInt(s.slice(2), 2);
  if (/^0o[0-7]+$/i.test(s)) return Number.parseInt(s.slice(2), 8);
  return -1;
}

// build the result box for a valid code point
function buildCodePointBox(cp: number, priority: number): Box {
  const kv: Record<string, string> = {
    Character: glyphLabel(cp),
    Decimal: String(cp),
    Hex: `0x${cp.toString(16).toUpperCase()}`,
    Octal: `0o${cp.toString(8)}`,
    Binary: `0b${cp.toString(2)}`,
    'HTML Entity': `&#${cp};`,
  };
  return new BoxBuilder('ASCII Code', kvToPlaintext(kv))
    .setOptions(kv)
    .setTemplate(KeyValueBoxTemplate)
    .setPriority(priority)
    .build();
}

// build an informational box when the input is not a valid lookup
function buildInfoBox(message: string, priority: number): Box {
  const kv: Record<string, string> = { Info: message };
  return new BoxBuilder('ASCII Code', kvToPlaintext(kv))
    .setOptions(kv)
    .setTemplate(KeyValueBoxTemplate)
    .setPriority(priority)
    .build();
}

export const AsciiTableBoxSource = {
  name: 'ASCII Code',
  description:
    'Look up a character or a code point: decimal, hex, octal, binary, and the glyph.',
  defaultInput: 'A ::ascii',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'ascii', 'charcode')) return [];

    const trimmed = trim(input);

    // limit extremely long inputs early
    if (trimmed.length > 32 && [...trimmed].length > 32) {
      return [
        buildInfoBox(
          'Enter a single character OR a code point (decimal / 0x / 0b / 0o).',
          Priority,
        ),
      ];
    }

    // single unicode character branch
    if ([...trimmed].length === 1) {
      const cp = trimmed.codePointAt(0) as number;
      return [buildCodePointBox(cp, Priority)];
    }

    // numeric code point branch
    const cp = parseCodePoint(trimmed);
    if (cp >= 0) {
      if (cp > 0x10ffff) {
        return [
          buildInfoBox(
            `Code point 0x${cp.toString(16).toUpperCase()} is outside the Unicode range (0..0x10FFFF).`,
            Priority,
          ),
        ];
      }
      return [buildCodePointBox(cp, Priority)];
    }

    // neither a single char nor a recognisable number
    return [
      buildInfoBox(
        'Enter a single character OR a code point (decimal / 0x / 0b / 0o).',
        Priority,
      ),
    ];
  },
};

export default AsciiTableBoxSource;
