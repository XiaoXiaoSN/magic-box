import { DefaultBoxTemplate } from '@components/BoxTemplate';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 20;

// supported HMAC hash algorithms
type HmacHash = 'SHA-1' | 'SHA-256' | 'SHA-512';

interface HmacAlgorithmEntry {
  hash: HmacHash;
  optionKeys: string[];
  label: string;
}

const HMAC_ALGORITHMS: HmacAlgorithmEntry[] = [
  { hash: 'SHA-1', optionKeys: ['sha1'], label: 'SHA1' },
  { hash: 'SHA-256', optionKeys: ['sha256'], label: 'SHA256' },
  { hash: 'SHA-512', optionKeys: ['sha512'], label: 'SHA512' },
];

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function computeHmac(
  hash: HmacHash,
  keyStr: string,
  message: string,
): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(keyStr),
    { name: 'HMAC', hash },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    keyMaterial,
    enc.encode(message),
  );
  return bufToHex(sig);
}

function resolveAlgorithm(options: BoxOptions): HmacAlgorithmEntry {
  const match = HMAC_ALGORITHMS.find((alg) =>
    hasOptionKeys(options, ...alg.optionKeys),
  );
  // default to SHA-256 when no algorithm option is present
  return match ?? HMAC_ALGORITHMS[1];
}

export const HmacBoxSource = {
  name: 'HMAC',
  description:
    'Compute an HMAC (SHA-256 by default) of the input using a key. e.g. "msg ::hmac=secret".',
  defaultInput: 'The quick brown fox ::hmac=key',
  tag: '#',
  kind: 'Hash',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'hmac')) return [];

    // guard: crypto.subtle requires a secure context
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      return [
        new BoxBuilder(
          'HMAC',
          'HMAC requires a secure context (HTTPS). crypto.subtle is not available.',
        )
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const keyValue = extractOptionKeys(options, 'hmac');

    // bare ::hmac without a value yields true (boolean) — key is required
    if (!keyValue || typeof keyValue !== 'string') {
      return [
        new BoxBuilder('HMAC', 'HMAC requires a key, e.g. ::hmac=secret')
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const alg = resolveAlgorithm(options);
    const hex = await computeHmac(alg.hash, keyValue, input);

    return [
      new BoxBuilder(`HMAC-${alg.label}`, hex)
        .setTemplate(DefaultBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default HmacBoxSource;
