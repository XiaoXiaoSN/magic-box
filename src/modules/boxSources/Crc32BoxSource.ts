import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 20;
const MAX_INPUT = 100_000;

// IEEE 802.3 polynomial in reflected (LSB-first) form
const POLY = 0xedb88320;

// build the 256-entry lookup table once at module load
const CRC32_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (c >>> 1) ^ POLY : c >>> 1;
    }
    table[i] = c;
  }
  return table;
})();

// compute IEEE CRC-32 over the UTF-8 encoding of `str`
function crc32(str: string): number {
  const bytes = new TextEncoder().encode(str);
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export const Crc32BoxSource = {
  name: 'CRC32',
  description: 'Compute the CRC-32 (IEEE 802.3) checksum of the input text.',
  defaultInput: 'hello ::crc32',
  tag: '#',
  kind: 'Hash',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'crc32', 'crc')) return [];
    if (input.length === 0 || input.length > MAX_INPUT) return [];

    const checksum = crc32(input);
    const hex = checksum.toString(16).padStart(8, '0');
    const decimal = checksum.toString(10);

    const output: Record<string, string> = {
      Hex: hex,
      Decimal: decimal,
    };

    return [
      new BoxBuilder('CRC32', JSON.stringify(output))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(output)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default Crc32BoxSource;
