import { DefaultBoxTemplate } from '@components/BoxTemplate';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// builds a UUID v7 per RFC 9562: 48-bit ms timestamp + version nibble +
// 74 random bits + variant bits, formatted as canonical lowercase hex.
function generateUuidV7(): string {
  const bytes = new Uint8Array(16);

  // embed the current time in the high 48 bits (bytes 0-5)
  const now = Date.now();
  bytes[0] = (now / 0x10000000000) & 0xff;
  bytes[1] = (now / 0x100000000) & 0xff;
  bytes[2] = (now / 0x1000000) & 0xff;
  bytes[3] = (now / 0x10000) & 0xff;
  bytes[4] = (now / 0x100) & 0xff;
  bytes[5] = now & 0xff;

  // fill bytes 6-15 with random data
  crypto.getRandomValues(new Uint8Array(bytes.buffer, 6, 10));

  // set version 7 in the high nibble of byte 6
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  // set RFC 4122 variant (10xx) in the high bits of byte 8
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(
    '',
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const UuidV7BoxSource = {
  name: 'UUID v7',
  description: 'Generate a time-ordered UUID version 7 (RFC 9562).',
  defaultInput: 'uuidv7 ::uuidv7',
  tag: '#',
  kind: 'Generate',
  priority: Priority,

  async generateBoxes(
    _input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'uuidv7', 'uuid7')) return [];

    if (
      typeof crypto === 'undefined' ||
      typeof crypto.getRandomValues !== 'function'
    ) {
      return [
        new BoxBuilder(
          'UUID v7',
          'Error: crypto.getRandomValues is unavailable. A secure context (HTTPS or localhost) is required.',
        )
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    return [
      new BoxBuilder('UUID v7', generateUuidV7())
        .setTemplate(DefaultBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default UuidV7BoxSource;
