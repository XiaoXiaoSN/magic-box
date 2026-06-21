import { DefaultBoxTemplate } from '@components/BoxTemplate';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// url-safe base64 alphabet: standard but with + → - and / → _
const BASE64URL_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

// reverse lookup for the STANDARD alphabet, built once (255 = invalid)
const DECODE_LOOKUP = (() => {
  const stdAlphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const table = new Uint8Array(256).fill(255);
  for (let i = 0; i < 64; i++) {
    table[stdAlphabet.charCodeAt(i)] = i;
  }
  table['='.charCodeAt(0)] = 0;
  return table;
})();

// encode bytes to url-safe base64 with no padding
function encodeBase64Url(bytes: Uint8Array): string {
  let result = '';
  const len = bytes.length;
  let i = 0;
  while (i < len) {
    const b0 = bytes[i++];
    const b1 = i < len ? bytes[i++] : 0;
    const b2 = i < len ? bytes[i++] : 0;
    result += BASE64URL_ALPHABET[b0 >> 2];
    result += BASE64URL_ALPHABET[((b0 & 0x3) << 4) | (b1 >> 4)];
    result += BASE64URL_ALPHABET[((b1 & 0xf) << 2) | (b2 >> 6)];
    result += BASE64URL_ALPHABET[b2 & 0x3f];
  }
  // strip padding characters from the end based on remainder
  const remainder = len % 3;
  if (remainder === 1) return result.slice(0, -2);
  if (remainder === 2) return result.slice(0, -1);
  return result;
}

// decode url-safe base64 to bytes; throws on invalid chars
function decodeBase64Url(input: string): Uint8Array {
  // validate: only url-safe base64 chars allowed (no +, /, =, or whitespace)
  if (!/^[A-Za-z0-9\-_]*$/.test(input)) {
    throw new Error('invalid Base64URL input');
  }

  // re-add padding to reach a multiple of 4
  const padded = input + '==='.slice(0, (4 - (input.length % 4)) % 4);

  // convert url-safe chars back to standard base64 for lookup
  const std = padded.replace(/-/g, '+').replace(/_/g, '/');

  const lookup = DECODE_LOOKUP;

  const bytes: number[] = [];
  for (let i = 0; i < std.length; i += 4) {
    const a = lookup[std.charCodeAt(i)];
    const b = lookup[std.charCodeAt(i + 1)];
    const c = lookup[std.charCodeAt(i + 2)];
    const d = lookup[std.charCodeAt(i + 3)];

    if (a === 255 || b === 255 || c === 255 || d === 255) {
      throw new Error('invalid Base64URL input');
    }

    bytes.push((a << 2) | (b >> 4));
    if (std[i + 2] !== '=') bytes.push(((b & 0xf) << 4) | (c >> 2));
    if (std[i + 3] !== '=') bytes.push(((c & 0x3) << 6) | d);
  }
  return new Uint8Array(bytes);
}

export const Base64UrlBoxSource = {
  name: 'Base64 URL',
  description:
    'Encode text to URL-safe Base64 (RFC 4648 §5) or decode it back.',
  defaultInput: 'hello world ::base64url',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantEncode = hasOptionKeys(options, 'base64url', 'base64urlencode');
    const wantDecode = hasOptionKeys(options, 'base64urldecode');
    if (!wantEncode && !wantDecode) return [];
    if (input.length > MAX_INPUT) return [];

    const boxes: Box[] = [];

    if (wantEncode) {
      const bytes = new TextEncoder().encode(input);
      const encoded = encodeBase64Url(bytes);
      boxes.push(
        new BoxBuilder('Base64 URL (Encode)', encoded)
          .setOptions(options)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(Priority)
          .build(),
      );
    }

    if (wantDecode) {
      try {
        const bytes = decodeBase64Url(input);
        const decoded = new TextDecoder().decode(bytes);
        boxes.push(
          new BoxBuilder('Base64 URL (Decode)', decoded)
            .setOptions(options)
            .setTemplate(DefaultBoxTemplate)
            .setShowExpandButton(false)
            .setPriority(Priority)
            .build(),
        );
      } catch {
        boxes.push(
          new BoxBuilder('Base64 URL (Decode)', 'invalid Base64URL input')
            .setOptions(options)
            .setTemplate(DefaultBoxTemplate)
            .setShowExpandButton(false)
            .setPriority(Priority)
            .build(),
        );
      }
    }

    return boxes;
  },
};

export default Base64UrlBoxSource;
