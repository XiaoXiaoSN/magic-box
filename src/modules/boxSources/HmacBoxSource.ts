import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { errorBox, hasOptionKeys, keyValueBox } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// hash functions supported by Web Crypto for HMAC
type HmacHash = 'SHA-1' | 'SHA-256' | 'SHA-512';

interface AlgorithmEntry {
  hash: HmacHash;
  // option keys that select this algorithm. a value on any of them is also
  // accepted as the HMAC key, so `::sha256=secret` is a complete invocation.
  keys: string[];
  // row label in the output box
  label: string;
}

// output order is fixed: SHA-256 first because it is the common default
const ALGORITHMS: AlgorithmEntry[] = [
  { hash: 'SHA-256', keys: ['sha256', 'hmacsha256'], label: 'HMAC-SHA256' },
  { hash: 'SHA-1', keys: ['sha1', 'hmacsha1'], label: 'HMAC-SHA1' },
  { hash: 'SHA-512', keys: ['sha512', 'hmacsha512'], label: 'HMAC-SHA512' },
];

// keys that activate this source on their own, even without a value
const TRIGGER_KEYS = ['hmac', 'hmacsha256', 'hmacsha1', 'hmacsha512'];

// keys whose value may carry the HMAC key, in lookup order. bare `::sha256`
// is NOT a trigger (that is the plain Hash box); `::sha256=secret` is.
const KEY_VALUE_KEYS = [...TRIGGER_KEYS, 'sha256', 'sha1', 'sha512'];

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function computeHmac(
  hash: HmacHash,
  keyBytes: Uint8Array,
  messageBytes: Uint8Array,
): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    // cast: a Uint8Array is a valid BufferSource at runtime; the TS 5.7
    // ArrayBufferLike-vs-ArrayBuffer narrowing is overly strict here
    keyBytes as BufferSource,
    { name: 'HMAC', hash },
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

// first non-empty string value among the key-carrying options, or null
function resolveKey(options: BoxOptions): string | null {
  if (options === null) return null;
  for (const k of KEY_VALUE_KEYS) {
    const v = options[k];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return null;
}

// algorithms explicitly selected via `::sha256` / `::hmacsha256` etc.
// none selected means "all of them".
function selectAlgorithms(options: BoxOptions): AlgorithmEntry[] {
  const selected = ALGORITHMS.filter((alg) =>
    hasOptionKeys(options, ...alg.keys),
  );
  return selected.length > 0 ? selected : ALGORITHMS;
}

export const HmacBoxSource = {
  defaultDisabled: true,
  name: 'HMAC',
  description:
    'Compute HMAC of the input with a key: ::hmac=<key>. Select algorithms with ::sha256, ::sha1, ::sha512 (default: all); each also accepts the key, e.g. ::sha512=<key>.',
  defaultInput: 'The quick brown fox jumps over the lazy dog ::hmac=key',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const key = resolveKey(options);

    // trigger: an explicit hmac option, or a sha option carrying a key
    if (!hasOptionKeys(options, ...TRIGGER_KEYS) && key === null) {
      return [];
    }

    // note: `::hmac=` parses to `true`, so empty and bare both land here
    if (key === null) {
      return [
        errorBox('HMAC', 'provide a key, e.g. ::hmac=secret', {
          priority: this.priority,
        }),
      ];
    }

    if (!isString(input) || input.length > MAX_INPUT) {
      return [];
    }

    // crypto.subtle requires a secure context (HTTPS or localhost)
    if (typeof crypto === 'undefined' || !crypto?.subtle) {
      return [
        errorBox(
          'HMAC',
          'HMAC requires a secure context (HTTPS). crypto.subtle is not available.',
          { priority: this.priority },
        ),
      ];
    }

    const algorithms = selectAlgorithms(options);
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode(key);
    const messageBytes = encoder.encode(input);

    let digests: string[];
    try {
      digests = await Promise.all(
        algorithms.map((alg) => computeHmac(alg.hash, keyBytes, messageBytes)),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return [
        errorBox('HMAC', `HMAC computation failed: ${message}`, {
          priority: this.priority,
        }),
      ];
    }

    const kv: Record<string, string> = {};
    algorithms.forEach((alg, i) => {
      kv[alg.label] = digests[i];
    });
    // key length in bytes (UTF-8); the key itself is a secret and never echoed
    kv['Key Length'] = String(keyBytes.byteLength);

    return [
      keyValueBox(KeyValueBoxTemplate, 'HMAC', kv, {
        priority: this.priority,
        showExpandButton: false,
      }),
    ];
  },
};

export default HmacBoxSource;
