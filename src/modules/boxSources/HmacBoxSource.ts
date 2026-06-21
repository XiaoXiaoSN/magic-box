import {
  DefaultBoxTemplate,
  KeyValueBoxTemplate,
} from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// supported HMAC hash algorithms
type HmacAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-512';

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function computeHmac(
  algorithm: HmacAlgorithm,
  keyBytes: Uint8Array,
  messageBytes: Uint8Array,
): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    // cast: a Uint8Array is a valid BufferSource at runtime; the TS 5.7
    // ArrayBufferLike-vs-ArrayBuffer narrowing is overly strict here
    keyBytes as BufferSource,
    { name: 'HMAC', hash: algorithm },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    messageBytes as BufferSource,
  );
  return bufToHex(signature);
}

// build k:v plaintext for the KeyValueBoxTemplate plaintextOutput
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

export const HmacBoxSource = {
  name: 'HMAC',
  description:
    'Compute HMAC-SHA256/SHA1/SHA512 of the input using a key. ::hmac=<key>.',
  defaultInput: 'The quick brown fox jumps over the lazy dog ::hmac=key',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'hmac', 'hmacsha256')) {
      return [];
    }

    const key = extractOptionKeys(options, 'hmac', 'hmacsha256');

    // bare ::hmac without a value → show usage hint
    if (key === true) {
      return [
        new BoxBuilder('HMAC', 'provide a key, e.g. ::hmac=secret')
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // key must be a non-empty string
    if (!isString(key) || key === null) {
      return [];
    }

    if (!isString(input) || input.length > MAX_INPUT) {
      return [];
    }

    // crypto.subtle requires a secure context (HTTPS or localhost)
    if (typeof crypto === 'undefined' || !crypto?.subtle) {
      return [
        new BoxBuilder(
          'HMAC',
          'a secure context (HTTPS) is required — crypto.subtle is not available.',
        )
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const keyStr = key as string;
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode(keyStr);
    const messageBytes = encoder.encode(input);

    const [sha256, sha1, sha512] = await Promise.all([
      computeHmac('SHA-256', keyBytes, messageBytes),
      computeHmac('SHA-1', keyBytes, messageBytes),
      computeHmac('SHA-512', keyBytes, messageBytes),
    ]);

    // key length in bytes (UTF-8); do NOT expose the key itself
    const keyByteLength = keyBytes.byteLength;

    const kv: Record<string, string> = {
      'HMAC-SHA256': sha256,
      'HMAC-SHA1': sha1,
      'HMAC-SHA512': sha512,
      'Key Length': String(keyByteLength),
    };

    return [
      new BoxBuilder('HMAC', kvToPlaintext(kv))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kv)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default HmacBoxSource;
