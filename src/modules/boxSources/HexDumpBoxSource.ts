import { CodeBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 50_000;
const BYTES_PER_LINE = 16;

// format a single hexdump line: offset + hex columns + ascii sidebar
function formatLine(offset: number, chunk: Uint8Array): string {
  const offsetStr = offset.toString(16).padStart(8, '0');

  // split 16 bytes into two groups of 8 for the classic mid-gap
  const leftHex = Array.from(chunk.slice(0, 8))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ');
  const rightHex = Array.from(chunk.slice(8))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ');

  // pad incomplete lines so the ascii column always aligns
  const leftPadded = leftHex.padEnd(23, ' ');
  const rightPadded = rightHex.padEnd(23, ' ');

  const ascii = Array.from(chunk)
    .map((b) => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '.'))
    .join('');

  return `${offsetStr}  ${leftPadded}  ${rightPadded}  |${ascii}|`;
}

// encode input as UTF-8 bytes and produce hexdump -C style output
function hexdump(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const lines: string[] = [];

  for (let offset = 0; offset < bytes.length; offset += BYTES_PER_LINE) {
    const chunk = bytes.slice(offset, offset + BYTES_PER_LINE);
    lines.push(formatLine(offset, chunk));
  }

  // final offset line (same as hexdump -C)
  const endOffset = bytes.length.toString(16).padStart(8, '0');
  lines.push(endOffset);

  return lines.join('\n');
}

export const HexDumpBoxSource = {
  name: 'Hex Dump',
  description:
    'Produce a canonical hexdump (offset, hex bytes, ASCII) of the input.',
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

    const output = hexdump(input);

    return [
      new BoxBuilder('Hex Dump', output)
        .setTemplate(CodeBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default HexDumpBoxSource;
