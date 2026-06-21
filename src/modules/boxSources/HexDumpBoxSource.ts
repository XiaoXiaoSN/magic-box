import { CodeBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 50_000;
// number of bytes per row, matching hexdump -C
const ROW_WIDTH = 16;

// renders one row in hexdump -C format:
// <offset>  <8 hex bytes>  <8 hex bytes>  |<ascii>|
function formatRow(offset: number, bytes: Uint8Array): string {
  const hex: string[] = [];
  const ascii: string[] = [];

  for (let i = 0; i < ROW_WIDTH; i++) {
    if (i < bytes.length) {
      hex.push(bytes[i].toString(16).padStart(2, '0'));
      // printable ASCII range 0x20–0x7e; everything else shown as '.'
      ascii.push(
        bytes[i] >= 0x20 && bytes[i] <= 0x7e
          ? String.fromCharCode(bytes[i])
          : '.',
      );
    } else {
      // pad short final row so the ASCII column lines up
      hex.push('  ');
    }
  }

  const firstHalf = hex.slice(0, 8).join(' ');
  const secondHalf = hex.slice(8, 16).join(' ');
  const offsetStr = offset.toString(16).padStart(8, '0');

  return `${offsetStr}  ${firstHalf}  ${secondHalf}  |${ascii.join('')}|`;
}

function hexDump(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const rows: string[] = [];

  for (let offset = 0; offset < bytes.length; offset += ROW_WIDTH) {
    rows.push(formatRow(offset, bytes.slice(offset, offset + ROW_WIDTH)));
  }

  return rows.join('\n');
}

export const HexDumpBoxSource = {
  name: 'Hex Dump',
  description:
    'Produce a canonical hex + ASCII dump of the input (like hexdump -C).',
  defaultInput: 'Hello, World! ::hexdump',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'hexdump', 'xxd')) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    const output = hexDump(input);

    return [
      new BoxBuilder('Hex Dump', output)
        .setTemplate(CodeBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default HexDumpBoxSource;
