import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// Crockford base32 alphabet — excludes I, L, O, U to avoid visual ambiguity
const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

// maps a Crockford base32 character to its 5-bit value
function crockfordCharValue(ch: string): number {
  const idx = ENCODING.indexOf(ch.toUpperCase());
  if (idx === -1) {
    throw new RangeError(`invalid Crockford base32 character: ${ch}`);
  }
  return idx;
}

// encodes a BigInt value into n Crockford base32 characters (most-significant first)
function encodeBase32(value: bigint, n: number): string {
  let result = '';
  let v = value;
  for (let i = 0; i < n; i++) {
    result = ENCODING[Number(v & 0x1fn)] + result;
    v >>= 5n;
  }
  return result;
}

// decodes the first n characters of a Crockford base32 string to a BigInt
function decodeBase32(chars: string, n: number): bigint {
  let result = 0n;
  for (let i = 0; i < n; i++) {
    result = (result << 5n) | BigInt(crockfordCharValue(chars[i]));
  }
  return result;
}

// generates a new ULID using Date.now() for the timestamp and
// crypto.getRandomValues for the 80-bit random component
function generateUlid(): string {
  const tsMs = BigInt(Date.now());

  // 10 Crockford base32 chars encode 50 bits; the 48-bit ms timestamp
  // fits with room to spare (max 48-bit value = 281474976710655 ms ≈ year 10889)
  const tsPart = encodeBase32(tsMs, 10);

  // 80 bits of randomness → 16 base32 chars (each char = 5 bits)
  const randBytes = new Uint8Array(10);
  crypto.getRandomValues(randBytes);

  // pack 10 bytes into a bigint for base32 encoding
  let randBits = 0n;
  for (const byte of randBytes) {
    randBits = (randBits << 8n) | BigInt(byte);
  }

  const randPart = encodeBase32(randBits, 16);
  return tsPart + randPart;
}

// 26-character Crockford base32 ULID pattern (case-insensitive)
const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/i;

export const UlidBoxSource = {
  name: 'ULID',
  description:
    'Generate a ULID (::ulid) or decode the timestamp of an existing ULID (::ulid=<ulid> or ::ulidparse).',
  defaultInput: ' ::ulid',
  tag: '#',
  kind: 'Generate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'ulid', 'ulidparse')) return [];

    const trimmed = trim(input).toUpperCase();

    if (ULID_REGEX.test(trimmed)) {
      // decode path: extract the 48-bit millisecond timestamp from the first 10 chars
      const tsMs = Number(decodeBase32(trimmed, 10));
      const isoTimestamp = new Date(tsMs).toISOString();

      const content = `ULID: ${trimmed}\nTimestamp: ${isoTimestamp}\nUnix (ms): ${tsMs}`;
      const kvOptions: Record<string, string> = {
        ULID: trimmed,
        Timestamp: isoTimestamp,
        'Unix (ms)': tsMs.toString(),
      };

      return [
        new BoxBuilder('ULID', content)
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(kvOptions)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // generate path: produce a fresh ULID
    if (
      typeof crypto === 'undefined' ||
      typeof crypto.getRandomValues !== 'function'
    ) {
      const errorContent = 'ULID generation requires a secure context (HTTPS).';
      return [
        new BoxBuilder('ULID', errorContent).setPriority(this.priority).build(),
      ];
    }

    const ulid = generateUlid();
    const tsMs = Number(decodeBase32(ulid, 10));
    const isoTimestamp = new Date(tsMs).toISOString();

    const content = `ULID: ${ulid}\nTimestamp: ${isoTimestamp}\nUnix (ms): ${tsMs}`;
    const kvOptions: Record<string, string> = {
      ULID: ulid,
      Timestamp: isoTimestamp,
      'Unix (ms)': tsMs.toString(),
    };

    return [
      new BoxBuilder('ULID', content)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kvOptions)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default UlidBoxSource;
