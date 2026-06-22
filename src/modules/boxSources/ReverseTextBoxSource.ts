import { CodeBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// reverse a string by unicode code points so multi-byte chars (emoji, etc.) stay intact
function reverseChars(str: string): string {
  return [...str].reverse().join('');
}

// reverse word order; multiple whitespace runs collapse to a single space
function reverseWords(str: string): string {
  return str.split(/\s+/).reverse().join(' ');
}

// reverse line order; normalize CRLF to LF first
function reverseLines(str: string): string {
  return str.replace(/\r\n/g, '\n').split('\n').reverse().join('\n');
}

export const ReverseTextBoxSource = {
  name: 'Reverse Text',
  description:
    'Reverse text by characters (default), words (::reverse=words), or lines (::reverse=lines).',
  defaultInput: 'hello world ::reverse',
  tag: '#',
  kind: 'Transform',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'reverse')) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    const mode = extractOptionKeys(options, 'reverse');

    let output: string;
    if (mode === 'words') {
      output = reverseWords(input);
    } else if (mode === 'lines') {
      output = reverseLines(input);
    } else {
      // default: chars (handles true/empty/'chars'/any other value)
      output = reverseChars(input);
    }

    const box = new BoxBuilder('Reverse Text', output)
      .setTemplate(CodeBoxTemplate)
      .setPriority(this.priority)
      .build();

    return [box];
  },
};

export default ReverseTextBoxSource;
