import { DefaultBoxTemplate } from '@components/BoxTemplate';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder } from '@modules/Box';

const PriorityUuidBox = 10;

type Match = boolean;

// fallback for non-secure contexts (plain HTTP) where crypto.randomUUID is
// unavailable — uses getRandomValues when possible for cryptographic quality.
function generateUuidV4(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.getRandomValues === 'function'
  ) {
    crypto.getRandomValues(bytes);
  } else {
    // last-resort fallback when the Web Crypto API is entirely absent
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // set version (4) and variant bits per RFC 4122
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(
    '',
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const UuidBoxSource = {
  name: 'UUID',
  description: 'Generate a fresh UUID v4, uppercase optional.',
  defaultInput: 'uuid',
  tag: '⚂',
  kind: 'Generate',
  priority: PriorityUuidBox,

  checkMatch(input: string): Match | undefined {
    // Match "uuid" or "UUID"
    const match = /^\s*uuid\s*$/i.exec(input);
    if (!match) {
      return undefined;
    }

    // If input is uppercase, return uppercase flag
    return true;
  },

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const match = this.checkMatch(input);
    if (!match) {
      return [];
    }

    let uuid: string = generateUuidV4();
    if (options && (options.uppercase || options.upper)) {
      uuid = uuid.toUpperCase();
    }

    return [
      new BoxBuilder('UUID', uuid)
        .setTemplate(DefaultBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default UuidBoxSource;
