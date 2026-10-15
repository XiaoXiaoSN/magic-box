import type { Box, BoxOptions } from '@modules/Box';
import {
  errorBox,
  extractOptionKeys,
  hasOptionKeys,
  keyValueBox,
} from '@modules/Box';

const Priority = 10;

// iterations are capped so a stray `::iterations=99999999` cannot pin the
// crypto thread for seconds on every keystroke. deriveBits runs off the main
// thread in browsers, but the box still cannot render until it resolves.
const MAX_ITERATIONS = 1_000_000;
const DEFAULT_ITERATIONS = 100_000;
const DEFAULT_DKLEN = 32;
const MAX_DKLEN = 256;
// bound the aggregate HMAC work across every requested PRF and derived block.
// the previous per-call iteration cap allowed three PRFs and 256 bytes to
// schedule roughly 24 million HMAC blocks for one keystroke.
const MAX_HMAC_BLOCKS = 1_000_000;

// pseudo-random functions supported by Web Crypto PBKDF2
type PrfHash = 'SHA-1' | 'SHA-256' | 'SHA-512';

interface PrfEntry {
  hash: PrfHash;
  digestBytes: number;
  // bare option keys that select this PRF (`::sha512`)
  keys: string[];
  // accepted values for `::prf=<name>` after normalisation (lowercase, alnum)
  aliases: string[];
  // human-readable label shown in the output
  label: string;
}

const PRFS: PrfEntry[] = [
  {
    hash: 'SHA-256',
    digestBytes: 32,
    keys: ['sha256'],
    aliases: ['sha256', 'hmacsha256'],
    label: 'HMAC-SHA256',
  },
  {
    hash: 'SHA-1',
    digestBytes: 20,
    keys: ['sha1'],
    aliases: ['sha1', 'hmacsha1'],
    label: 'HMAC-SHA1',
  },
  {
    hash: 'SHA-512',
    digestBytes: 64,
    keys: ['sha512'],
    aliases: ['sha512', 'hmacsha512'],
    label: 'HMAC-SHA512',
  },
];
const DEFAULT_PRF = PRFS[0];

interface DerivationCache {
  input: string;
  salt: string;
  iterations: number;
  dklen: number;
  prfs: readonly PrfHash[];
  promise: Promise<string[]>;
}

let lastDerivation: DerivationCache | null = null;

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// parse a positive integer option, clamped to [min, max]; non-numeric or
// missing values fall back. the clamped value is echoed in the output so the
// user can see what was actually used.
function clampNumericOption(
  raw: string | boolean | null,
  fallback: number,
  min: number,
  max: number,
): number {
  if (typeof raw !== 'string') return fallback;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

// PRFs to derive with, in canonical order. `::prf=<name>` picks exactly one
// (unknown names are rejected with null); bare `::sha1`/`::sha256`/`::sha512`
// may select several; nothing selected means the SHA-256 default.
function selectPrfs(options: BoxOptions): PrfEntry[] | null {
  const prfRaw = extractOptionKeys(options, 'prf');
  if (typeof prfRaw === 'string') {
    const wanted = prfRaw.toLowerCase().replace(/[^a-z0-9]/g, '');
    const found = PRFS.find((p) => p.aliases.includes(wanted));
    return found ? [found] : null;
  }

  const selected = PRFS.filter((p) => hasOptionKeys(options, ...p.keys));
  return selected.length > 0 ? selected : [DEFAULT_PRF];
}

function maxIterationsFor(prfs: readonly PrfEntry[], dklen: number): number {
  const hmacBlocks = prfs.reduce(
    (total, prf) => total + Math.ceil(dklen / prf.digestBytes),
    0,
  );
  return Math.max(
    1,
    Math.min(MAX_ITERATIONS, Math.floor(MAX_HMAC_BLOCKS / hmacBlocks)),
  );
}

function hasSameParameters(
  cache: DerivationCache,
  input: string,
  salt: string,
  iterations: number,
  dklen: number,
  prfs: readonly PrfEntry[],
): boolean {
  return (
    cache.input === input &&
    cache.salt === salt &&
    cache.iterations === iterations &&
    cache.dklen === dklen &&
    cache.prfs.length === prfs.length &&
    cache.prfs.every((hash, index) => hash === prfs[index].hash)
  );
}

async function derive(
  prf: PrfEntry,
  passwordBytes: Uint8Array,
  saltBytes: Uint8Array,
  iterations: number,
  dklen: number,
): Promise<string> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    // cast: a Uint8Array is a valid BufferSource at runtime; the TS 5.7
    // ArrayBufferLike-vs-ArrayBuffer narrowing is overly strict here
    passwordBytes as BufferSource,
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes as BufferSource,
      iterations,
      hash: prf.hash,
    },
    baseKey,
    dklen * 8,
  );
  return bufToHex(bits);
}

export const Pbkdf2BoxSource = {
  defaultDisabled: true,
  name: 'PBKDF2',
  description:
    'Derive a key from the input password: ::pbkdf2=<salt>. Options ::iterations=<n>, ::dklen=<bytes>, and the PRF via ::prf=sha256|sha1|sha512 or bare ::sha256/::sha1/::sha512 (default HMAC-SHA256).',
  defaultInput: 'password\n::pbkdf2=salt',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const salt = extractOptionKeys(options, 'pbkdf2');

    // no ::pbkdf2 option at all — not our trigger
    if (salt === null) return [];

    // bare `::pbkdf2` (and `::pbkdf2=`, which parses to true) — usage hint.
    // the password is the main input; the salt rides on the option.
    if (typeof salt !== 'string') {
      return [
        errorBox('PBKDF2', 'provide a salt, e.g. ::pbkdf2=salt', {
          priority: this.priority,
        }),
      ];
    }

    const prfs = selectPrfs(options);
    if (prfs === null) {
      return [
        errorBox(
          'PBKDF2',
          'unknown PRF; use ::prf=sha256, ::prf=sha1 or ::prf=sha512',
          { priority: this.priority },
        ),
      ];
    }

    // guard against non-secure contexts where crypto.subtle is unavailable
    if (typeof crypto === 'undefined' || !crypto?.subtle) {
      return [
        errorBox(
          'PBKDF2',
          'PBKDF2 requires a secure context (HTTPS). crypto.subtle is not available.',
          { priority: this.priority },
        ),
      ];
    }

    const requestedIterations = clampNumericOption(
      extractOptionKeys(options, 'iterations'),
      DEFAULT_ITERATIONS,
      1,
      MAX_ITERATIONS,
    );
    const dklen = clampNumericOption(
      extractOptionKeys(options, 'dklen'),
      DEFAULT_DKLEN,
      1,
      MAX_DKLEN,
    );
    const iterations = Math.min(
      requestedIterations,
      maxIterationsFor(prfs, dklen),
    );

    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(input);
    const saltBytes = encoder.encode(salt);

    let derivationPromise: Promise<string[]> | null = null;
    try {
      const cached = lastDerivation;
      const promise =
        cached &&
        hasSameParameters(cached, input, salt, iterations, dklen, prfs)
          ? cached.promise
          : Promise.all(
              prfs.map((prf) =>
                derive(prf, passwordBytes, saltBytes, iterations, dklen),
              ),
            );
      derivationPromise = promise;
      if (promise !== cached?.promise) {
        lastDerivation = {
          input,
          salt,
          iterations,
          dklen,
          prfs: prfs.map((prf) => prf.hash),
          promise,
        };
      }
      const keys = await promise;

      // the password is intentionally excluded from the output — it's a secret
      return prfs.map((prf, i) =>
        keyValueBox(
          'keyValue',
          'PBKDF2',
          {
            'Derived Key (hex)': keys[i],
            Salt: salt,
            Iterations: String(iterations),
            'Key Length (bytes)': String(dklen),
            PRF: prf.label,
          },
          { priority: this.priority },
        ),
      );
    } catch (err) {
      if (
        derivationPromise !== null &&
        lastDerivation?.promise === derivationPromise
      ) {
        lastDerivation = null;
      }
      const message = err instanceof Error ? err.message : String(err);
      return [
        errorBox('PBKDF2', `Key derivation failed: ${message}`, {
          priority: this.priority,
        }),
      ];
    }
  },
};

export default Pbkdf2BoxSource;
