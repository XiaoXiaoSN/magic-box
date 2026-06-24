import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// offset between ASCII printable range (0x21-0x7E) and fullwidth Unicode block (U+FF01-U+FF5E)
const FULLWIDTH_OFFSET = 0xfee0;

// convert ASCII printable chars to their fullwidth Unicode equivalents
function toFullwidth(input: string): string {
  let result = '';
  for (const ch of input) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp === 0x20) {
      // ASCII space → ideographic space U+3000
      result += '　';
    } else if (cp >= 0x21 && cp <= 0x7e) {
      // printable ASCII → fullwidth form
      result += String.fromCodePoint(cp + FULLWIDTH_OFFSET);
    } else {
      result += ch;
    }
  }
  return result;
}

// reverse fullwidth Unicode forms back to ASCII
function toHalfwidth(input: string): string {
  let result = '';
  for (const ch of input) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp === 0x3000) {
      // ideographic space → ASCII space
      result += ' ';
    } else if (cp >= 0xff01 && cp <= 0xff5e) {
      // fullwidth form → ASCII printable
      result += String.fromCodePoint(cp - FULLWIDTH_OFFSET);
    } else {
      result += ch;
    }
  }
  return result;
}

export const FullwidthBoxSource = {
  defaultDisabled: true,
  name: 'Fullwidth',
  description:
    'Convert ASCII text to fullwidth Unicode forms, or fullwidth back to ASCII.',
  defaultInput: 'Hello 123 ::fullwidth',
  tag: '#',
  kind: 'Transform',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantEncode = hasOptionKeys(options, 'fullwidth', 'tofullwidth');
    const wantDecode = hasOptionKeys(options, 'halfwidth', 'fromfullwidth');
    if (!wantEncode && !wantDecode) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    const boxes: Box[] = [];

    if (wantEncode) {
      const output = toFullwidth(input);
      boxes.push(
        new BoxBuilder('Fullwidth', output)
          .setTemplate(DefaultBoxTemplate)
          .setPriority(this.priority)
          .setShowExpandButton(false)
          .build(),
      );
    }

    if (wantDecode) {
      const output = toHalfwidth(input);
      boxes.push(
        new BoxBuilder('Halfwidth', output)
          .setTemplate(DefaultBoxTemplate)
          .setPriority(this.priority)
          .setShowExpandButton(false)
          .build(),
      );
    }

    return boxes;
  },
};

export default FullwidthBoxSource;
