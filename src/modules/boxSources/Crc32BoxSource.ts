import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// precompute the IEEE 802.3 (reflected) CRC-32 lookup table once at module load
const CRC32_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      // reflected polynomial 0xEDB88320 (bit-reversed 0x04C11DB7)
      c = c & 1 ? (0xedb88320 ^ (c >>> 1)) >>> 0 : (c >>> 1) >>> 0;
    }
    table[i] = c;
  }
  return table;
})();

function computeCrc32(input: string): number {
  const bytes = new TextEncoder().encode(input);
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)) >>> 0;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export const Crc32BoxSource = {
  name: 'CRC-32',
  description: 'Compute the CRC-32 (IEEE 802.3) checksum of the input text.',
  defaultInput: 'hello ::crc32',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'crc32')) return [];
    if (
      !isString(input) ||
      trim(input).length === 0 ||
      input.length > MAX_INPUT
    )
      return [];

    const checksum = computeCrc32(input);
    const hex = checksum.toString(16).padStart(8, '0');

    const output: Record<string, string> = {
      Hex: hex,
      Decimal: checksum.toString(10),
      Uppercase: hex.toUpperCase(),
    };

    return [
      new BoxBuilder('CRC-32', hex)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(output)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default Crc32BoxSource;
