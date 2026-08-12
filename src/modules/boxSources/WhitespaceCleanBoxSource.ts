import { CodeBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// collapse runs of spaces/tabs to a single space on each line,
// trim surrounding whitespace, then drop lines that become empty.
function cleanWhitespace(input: string): string {
  return (
    input
      // normalize CRLF and bare-CR (old Mac) line endings to \n first
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map((line) => line.replace(/[ \t]+/g, ' ').trim())
      .filter((line) => line.length > 0)
      .join('\n')
  );
}

export const WhitespaceCleanBoxSource = {
  defaultDisabled: true,
  name: 'Whitespace Clean',
  description:
    'Trim each line, collapse internal whitespace runs, and remove blank lines.',
  defaultInput: '  hello   world  \n\n\n  foo  bar ::clean',
  tag: '#',
  kind: 'Transform',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'clean', 'cleanws')) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    const cleaned = cleanWhitespace(input);
    if (cleaned.length === 0) return [];

    return [
      new BoxBuilder('Whitespace Clean', cleaned)
        .setTemplate(CodeBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default WhitespaceCleanBoxSource;
