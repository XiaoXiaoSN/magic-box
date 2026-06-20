import { DefaultBoxTemplate } from '@components/BoxTemplate';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// encode special HTML characters; & must go first to avoid double-encoding
function encodeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// map a numeric entity to its character; out-of-range code points (> U+10FFFF)
// are left as the original entity text instead of throwing a RangeError
function fromCodePointSafe(codePoint: number, original: string): string {
  return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : original;
}

// decode named and numeric entities; &amp; goes last to prevent over-decoding
function decodeHtml(input: string): string {
  return input
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (match, hex) =>
      fromCodePointSafe(Number.parseInt(hex, 16), match),
    )
    .replace(/&#(\d+);/g, (match, dec) =>
      fromCodePointSafe(Number.parseInt(dec, 10), match),
    )
    .replace(/&amp;/g, '&');
}

export const HtmlEntityBoxSource = {
  name: 'HTML Entity',
  description:
    'Encode text to HTML entities or decode HTML entities back to text.',
  defaultInput: '<div class="x">Tom & Jerry</div> ::htmlencode',
  tag: '&',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantEncode = hasOptionKeys(
      options,
      'htmlencode',
      'htmlentity',
      'htmlentities',
    );
    const wantDecode = hasOptionKeys(
      options,
      'htmldecode',
      'htmlentity',
      'htmlentities',
    );
    if (!wantEncode && !wantDecode) return [];

    const boxes: Box[] = [];
    if (wantEncode) {
      boxes.push(
        new BoxBuilder('HTML Encode', encodeHtml(input))
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }
    if (wantDecode) {
      boxes.push(
        new BoxBuilder('HTML Decode', decodeHtml(input))
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }
    return boxes;
  },
};

export default HtmlEntityBoxSource;
