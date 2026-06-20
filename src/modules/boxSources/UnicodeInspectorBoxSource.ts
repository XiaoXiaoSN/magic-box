import { CodeBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_CHARS = 256;

// reused across the per-character utf-8 lookups
const ENCODER = new TextEncoder();

// format a code point as U+XXXX (uppercase, minimum 4 hex digits)
function formatCodePoint(cp: number): string {
  return `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
}

// encode a single code point's UTF-8 bytes as space-separated lowercase 2-digit hex
function utf8Hex(ch: string): string {
  return Array.from(ENCODER.encode(ch))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ');
}

// encode a single code point's UTF-16 code units as space-separated lowercase 4-digit hex
function utf16Hex(ch: string): string {
  const units: string[] = [];
  for (let i = 0; i < ch.length; i++) {
    units.push(ch.charCodeAt(i).toString(16).padStart(4, '0'));
  }
  return units.join(' ');
}

// build one inspector line for a single code point character
function inspectChar(ch: string): string {
  const cp = ch.codePointAt(0) as number;
  return `${ch}  ${formatCodePoint(cp)}  dec=${cp}  utf8=${utf8Hex(ch)}  utf16=${utf16Hex(ch)}`;
}

export const UnicodeInspectorBoxSource = {
  name: 'Unicode Inspector',
  description:
    'Show the code point, UTF-8 and UTF-16 encoding of each character.',
  defaultInput: 'A€😀 ::unicode',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'unicode')) return [];
    if (!isString(input) || trim(input).length === 0) return [];

    const lines: string[] = [];
    let count = 0;
    let truncated = false;

    for (const ch of input) {
      if (count >= MAX_CHARS) {
        truncated = true;
        break;
      }
      lines.push(inspectChar(ch));
      count++;
    }

    // note truncation at the end of the output when input exceeds the cap
    if (truncated) {
      lines.push(`... truncated at ${MAX_CHARS} code points`);
    }

    const box = new BoxBuilder('Unicode Inspector', lines.join('\n'))
      .setTemplate(CodeBoxTemplate)
      .setPriority(this.priority)
      .build();

    return [box];
  },
};

export default UnicodeInspectorBoxSource;
