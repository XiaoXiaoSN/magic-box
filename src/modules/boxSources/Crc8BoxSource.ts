import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// CRC-8/SMBUS: poly 0x07, init 0x00, no reflect, no xorout
function crc8Smbus(bytes: Uint8Array): number {
  let crc = 0x00;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x80 ? ((crc << 1) ^ 0x07) & 0xff : (crc << 1) & 0xff;
    }
  }
  return crc & 0xff;
}

// CRC-8/MAXIM (Dallas 1-Wire): poly 0x31 reflected as 0x8C, refin/refout true
function crc8Maxim(bytes: Uint8Array): number {
  let crc = 0x00;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      crc = crc & 1 ? ((crc >> 1) ^ 0x8c) & 0xff : (crc >> 1) & 0xff;
    }
  }
  return crc & 0xff;
}

function toHex2(value: number): string {
  return `0x${value.toString(16).padStart(2, '0')}`;
}

export const Crc8BoxSource = {
  defaultDisabled: true,
  name: 'CRC-8',
  description:
    'Compute CRC-8 (SMBUS and Maxim/Dallas) checksums of the input text.',
  defaultInput: '123456789 ::crc8',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'crc8')) return [];
    if (
      !isString(input) ||
      trim(input).length === 0 ||
      input.length > MAX_INPUT
    )
      return [];

    // hash the trimmed input so the guard and the computed bytes agree
    const bytes = new TextEncoder().encode(trim(input));
    const smbus = crc8Smbus(bytes);
    const maxim = crc8Maxim(bytes);

    const kv: Record<string, string> = {
      SMBUS: toHex2(smbus),
      Maxim: toHex2(maxim),
    };

    const plaintextOutput = Object.entries(kv)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('CRC-8', plaintextOutput)
        .setOptions(kv)
        .setTemplate(KeyValueBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default Crc8BoxSource;
