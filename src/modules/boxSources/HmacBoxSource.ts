import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 20;
const MAX_INPUT = 100_000;

// supported HMAC hash algorithms mapped from user-facing alias to Web Crypto name
type SupportedHash = 'SHA-1' | 'SHA-256' | 'SHA-512';

const ALG_MAP: Record<string, SupportedHash> = {
  sha1: 'SHA-1',
  sha256: 'SHA-256',
  sha512: 'SHA-512',
};

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function computeHmac(
  hashName: SupportedHash,
  key: string,
  message: string,
): Promise<string> {
  const enc = new TextEncoder();
  const keyBytes = enc.encode(key);
  const msgBytes = enc.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: hashName },
    false,
    ['sign'],
  );

  const sig = await crypto.subtle.sign('HMAC', cryptoKey, msgBytes);
  return bufToHex(sig);
}

export const HmacBoxSource = {
  name: 'HMAC',
  description:
    'Compute an HMAC of the input using a secret key. ::hmac=key (SHA-256 default), or ::hmac=key ::hmacalg=sha1|sha256|sha512.',
  defaultInput: 'message ::hmac=secret',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'hmac')) return [];
    if (input.length > MAX_INPUT) return [];

    // guard for non-secure contexts where crypto.subtle is unavailable
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      return [
        new BoxBuilder(
          'HMAC',
          'HMAC requires a secure context (HTTPS). crypto.subtle is not available.',
        )
          .setTemplate(KeyValueBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const keyValue = extractOptionKeys(options, 'hmac');
    // key must be a non-empty string (boolean true means bare ::hmac with no value)
    if (!keyValue || keyValue === true || keyValue === '') {
      return [
        new BoxBuilder('HMAC', 'A secret key is required. Use ::hmac=yourkey.')
          .setTemplate(KeyValueBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const algAlias = extractOptionKeys(options, 'hmacalg');
    // unknown or missing alias defaults to SHA-256
    const hashName: SupportedHash =
      typeof algAlias === 'string' && ALG_MAP[algAlias.toLowerCase()]
        ? ALG_MAP[algAlias.toLowerCase()]
        : 'SHA-256';

    const algorithmLabel = `HMAC-${hashName.replace('-', '')}`;
    const hex = await computeHmac(hashName, keyValue, input);

    return [
      new BoxBuilder('HMAC', hex)
        .setOptions({ Algorithm: algorithmLabel, Hex: hex })
        .setTemplate(KeyValueBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default HmacBoxSource;
