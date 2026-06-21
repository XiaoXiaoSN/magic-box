import { CodeBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// right-pad a number string with leading spaces to reach the desired width
function padNumber(n: number, width: number): string {
  return String(n).padStart(width, ' ');
}

// add line numbers to text, optionally starting at a custom index
function addLineNumbers(input: string, start: number): string {
  const lines = input.split('\n').map((line) => line.replace(/\r$/, ''));
  const end = start + lines.length - 1;
  const width = String(end).length;
  return lines
    .map((line, i) => `${padNumber(start + i, width)} | ${line}`)
    .join('\n');
}

// strip a leading line-number prefix of the form: optional-spaces digits optional-spaces [|│:] optional-space
function stripLineNumbers(input: string): string {
  const PREFIX_RE = /^\s*\d+\s*[|│:]?\s?/;
  return input
    .split('\n')
    .map((line) => line.replace(PREFIX_RE, ''))
    .join('\n');
}

export const LineNumbersBoxSource = {
  name: 'Line Numbers',
  description:
    'Add line numbers to text (::linenumbers, optional ::linenumbers=<start>) or strip them (::stripnumbers).',
  defaultInput: 'first\nsecond\nthird ::linenumbers',
  tag: '#',
  kind: 'Transform',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantAdd = hasOptionKeys(options, 'linenumbers', 'numberlines');
    const wantStrip = hasOptionKeys(options, 'stripnumbers');
    if (!wantAdd && !wantStrip) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    let output: string;

    if (wantAdd) {
      const rawValue = extractOptionKeys(options, 'linenumbers', 'numberlines');
      // parse the numeric start value; default to 1 if absent or invalid
      const parsedStart =
        typeof rawValue === 'string'
          ? Number.parseInt(rawValue, 10)
          : Number.NaN;
      const start =
        Number.isFinite(parsedStart) && parsedStart >= 0 ? parsedStart : 1;
      output = addLineNumbers(input, start);
    } else {
      output = stripLineNumbers(input);
    }

    return [
      new BoxBuilder('Line Numbers', output)
        .setTemplate(CodeBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default LineNumbersBoxSource;
