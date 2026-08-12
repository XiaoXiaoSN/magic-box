import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// printable ASCII range excluding '=' (0x3D): codepoints 33–60 and 62–126 pass through as-is.
// space (32) and tab (9) also pass through literally.
// all other bytes, including newlines and non-ASCII, are encoded as =XX (uppercase hex).
// soft line-break wrapping (76-column limit) is intentionally omitted for determinism.
function encodeQP(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const parts: string[] = [];
  for (const byte of bytes) {
    if (
      (byte >= 33 && byte <= 60) ||
      (byte >= 62 && byte <= 126) ||
      byte === 9 ||
      byte === 32
    ) {
      parts.push(String.fromCharCode(byte));
    } else {
      parts.push(`=${byte.toString(16).toUpperCase().padStart(2, '0')}`);
    }
  }
  return parts.join('');
}

// decodes quoted-printable: =XX → byte, soft line breaks (=\r\n or =\n) → removed,
// bare characters → their UTF-8 byte. invalid =XX sequences are passed through literally (lenient).
function decodeQP(input: string): string {
  const bytes: number[] = [];
  let i = 0;
  while (i < input.length) {
    if (input[i] === '=') {
      // soft line break: =\r\n or =\n
      if (input[i + 1] === '\r' && input[i + 2] === '\n') {
        i += 3;
        continue;
      }
      if (input[i + 1] === '\n') {
        i += 2;
        continue;
      }
      // encoded byte: = followed by exactly 2 hex digits
      const hex = input.slice(i + 1, i + 3);
      if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
        bytes.push(Number.parseInt(hex, 16));
        i += 3;
        continue;
      }
      // lenient: not a valid sequence, emit the '=' literally
      bytes.push(0x3d);
      i++;
    } else {
      bytes.push(input.charCodeAt(i));
      i++;
    }
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

export const QuotedPrintableBoxSource = {
  defaultDisabled: true,
  name: 'Quoted-Printable',
  description:
    'Encode/decode MIME Quoted-Printable. ::quotedprintable to encode, ::qpdecode to decode.',
  defaultInput: 'Héllo World ::quotedprintable',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantEncode = hasOptionKeys(
      options,
      'quotedprintable',
      'qp',
      'qpencode',
    );
    const wantDecode = hasOptionKeys(
      options,
      'qpdecode',
      'quotedprintabledecode',
    );
    if (!wantEncode && !wantDecode) return [];
    if (
      !isString(input) ||
      trim(input).length === 0 ||
      input.length > MAX_INPUT
    )
      return [];

    const boxes: Box[] = [];

    if (wantEncode) {
      const encoded = encodeQP(input);
      boxes.push(
        new BoxBuilder('Quoted-Printable (Encode)', encoded)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    if (wantDecode) {
      const decoded = decodeQP(input);
      boxes.push(
        new BoxBuilder('Quoted-Printable (Decode)', decoded)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    return boxes;
  },
};

export default QuotedPrintableBoxSource;
