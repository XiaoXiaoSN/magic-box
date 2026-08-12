import {
  DefaultBoxTemplate,
  KeyValueBoxTemplate,
} from '@components/BoxTemplate';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys } from '@modules/Box';

const Priority = 10;

// max iterations capped to prevent UI freezes from absurdly large values
const MAX_ITERATIONS = 1_000_000;
const DEFAULT_ITERATIONS = 100_000;
const DEFAULT_DKLEN = 32;
const MAX_DKLEN = 256;

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// clamp a numeric value within [min, max], falling back to fallback when non-numeric
function clampNumericOption(
  raw: string | boolean | null,
  fallback: number,
  min: number,
  max: number,
): number {
  if (typeof raw !== 'string') return fallback;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

// converts a key-value record to a human-readable plaintext listing
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

export const Pbkdf2BoxSource = {
  defaultDisabled: true,
  name: 'PBKDF2',
  description:
    'Derive key bits from a password via PBKDF2 (HMAC-SHA256). Input is the salt; ::pbkdf2=<password>. Options ::iterations=<n>, ::dklen=<bytes>.',
  defaultInput: 'salt ::pbkdf2=password',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const password = extractOptionKeys(options, 'pbkdf2');

    // no ::pbkdf2 option at all — not our trigger
    if (password === null) return [];

    // bare ::pbkdf2 without a value — show usage hint
    if (typeof password !== 'string') {
      return [
        new BoxBuilder('PBKDF2', 'provide a password, e.g. ::pbkdf2=secret')
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // guard against non-secure contexts where crypto.subtle is unavailable
    if (typeof crypto === 'undefined' || !crypto?.subtle) {
      return [
        new BoxBuilder(
          'PBKDF2',
          'PBKDF2 requires a secure context (HTTPS). crypto.subtle is not available.',
        )
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const iterationsRaw = extractOptionKeys(options, 'iterations');
    const dklenRaw = extractOptionKeys(options, 'dklen');

    const iterations = clampNumericOption(
      iterationsRaw,
      DEFAULT_ITERATIONS,
      1,
      MAX_ITERATIONS,
    );
    const dklen = clampNumericOption(dklenRaw, DEFAULT_DKLEN, 1, MAX_DKLEN);

    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(password);
    const saltBytes = encoder.encode(input);

    try {
      const baseKey = await crypto.subtle.importKey(
        'raw',
        passwordBytes,
        'PBKDF2',
        false,
        ['deriveBits'],
      );

      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: saltBytes,
          iterations,
          hash: 'SHA-256',
        },
        baseKey,
        dklen * 8,
      );

      const hexKey = bufToHex(derivedBits);

      // password is intentionally excluded from the output — it's a secret
      const kv: Record<string, string> = {
        'Derived Key (hex)': hexKey,
        Salt: input,
        Iterations: String(iterations),
        'Key Length (bytes)': String(dklen),
        Hash: 'SHA-256',
      };

      return [
        new BoxBuilder('PBKDF2', kvToPlaintext(kv))
          .setOptions(kv)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return [
        new BoxBuilder('PBKDF2', `Key derivation failed: ${message}`)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }
  },
};

export default Pbkdf2BoxSource;
