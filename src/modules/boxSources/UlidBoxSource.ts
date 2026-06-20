import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// Crockford base32 alphabet: digits + uppercase letters minus I, L, O, U
const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

// encodes a 48-bit timestamp (ms) as 10 Crockford base32 chars, MSB first
function encodeTime(ms: number): string {
  const chars: string[] = [];
  let t = ms;
  for (let i = 0; i < 10; i++) {
    chars.unshift(ENCODING[t % 32]);
    t = Math.floor(t / 32);
  }
  return chars.join('');
}

// encodes 10 random bytes (80 bits) as 16 Crockford base32 chars via 5-bit groups
function encodeRandom(bytes: Uint8Array): string {
  let buf = 0;
  let bits = 0;
  let out = '';

  for (const byte of bytes) {
    buf = (buf << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += ENCODING[(buf >> bits) & 0x1f];
    }
  }

  // flush any remaining bits (80 % 5 === 0, so this won't fire for 10 bytes)
  if (bits > 0) {
    out += ENCODING[(buf << (5 - bits)) & 0x1f];
  }

  return out;
}

export const UlidBoxSource = {
  name: 'ULID',
  description:
    'Generate a ULID — a 26-char lexicographically sortable identifier (48-bit time + 80-bit randomness).',
  defaultInput: 'ulid ::ulid',
  tag: '#',
  kind: 'Generate',
  priority: Priority,

  async generateBoxes(
    _input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'ulid')) return [];

    if (
      typeof crypto === 'undefined' ||
      typeof crypto.getRandomValues !== 'function'
    ) {
      return [
        new BoxBuilder(
          'ULID',
          'crypto.getRandomValues is unavailable in this context',
        )
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const timeChars = encodeTime(Date.now());
    const randomBytes = new Uint8Array(10);
    crypto.getRandomValues(randomBytes);
    const randomChars = encodeRandom(randomBytes);
    const ulid = timeChars + randomChars;

    return [
      new BoxBuilder('ULID', ulid)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default UlidBoxSource;
