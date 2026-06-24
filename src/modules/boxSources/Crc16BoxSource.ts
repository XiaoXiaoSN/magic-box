import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// CRC-16/CCITT-FALSE: init=0xFFFF, poly=0x1021, no input/output reflection
function crc16CcittFalse(bytes: Uint8Array): number {
  let crc = 0xffff;
  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      crc =
        (crc & 0x8000) !== 0
          ? ((crc << 1) ^ 0x1021) & 0xffff
          : (crc << 1) & 0xffff;
    }
  }
  return crc & 0xffff;
}

// CRC-16/MODBUS: init=0xFFFF, poly=0xA001 (reflected 0x8005)
function crc16Modbus(bytes: Uint8Array): number {
  let crc = 0xffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      crc = (crc & 1) !== 0 ? (crc >> 1) ^ 0xa001 : crc >> 1;
    }
  }
  return crc & 0xffff;
}

function toHex4(value: number): string {
  return `0x${value.toString(16).padStart(4, '0')}`;
}

export const Crc16BoxSource = {
  defaultDisabled: true,
  name: 'CRC-16',
  description:
    'Compute CRC-16 (CCITT-FALSE and Modbus) checksums of the input text.',
  defaultInput: '123456789 ::crc16',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'crc16')) return [];
    if (
      !isString(input) ||
      trim(input).length === 0 ||
      input.length > MAX_INPUT
    )
      return [];

    const bytes = new TextEncoder().encode(input);

    const ccittFalse = toHex4(crc16CcittFalse(bytes));
    const modbus = toHex4(crc16Modbus(bytes));

    const plaintextOutput = `CCITT-FALSE: ${ccittFalse}\nModbus: ${modbus}`;

    const outputOptions: Record<string, string> = {
      'CCITT-FALSE': ccittFalse,
      Modbus: modbus,
    };

    return [
      new BoxBuilder('CRC-16', plaintextOutput)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(outputOptions)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default Crc16BoxSource;
