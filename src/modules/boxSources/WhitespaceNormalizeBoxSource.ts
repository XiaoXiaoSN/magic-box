import { CodeBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// normalize line endings to LF
function normalizeCRLF(text: string): string {
  return text.replace(/\r\n|\r/g, '\n');
}

// strip trailing whitespace from every line
function stripTrailingWhitespace(lines: string[]): string[] {
  return lines.map((line) => line.replace(/[ \t]+$/, ''));
}

// collapse 2+ consecutive blank lines to a single blank line
function collapseBlankLines(lines: string[]): string[] {
  const result: string[] = [];
  let blanks = 0;
  for (const line of lines) {
    if (line === '') {
      blanks++;
      if (blanks <= 1) result.push(line);
    } else {
      blanks = 0;
      result.push(line);
    }
  }
  return result;
}

// trim leading and trailing blank lines from the line array
function trimLeadingTrailingBlankLines(lines: string[]): string[] {
  let start = 0;
  while (start < lines.length && lines[start] === '') start++;
  let end = lines.length - 1;
  while (end >= start && lines[end] === '') end--;
  return lines.slice(start, end + 1);
}

// collapse internal runs of spaces/tabs to a single space and trim leading whitespace per line
function collapseInternalWhitespace(lines: string[]): string[] {
  return lines.map((line) =>
    line.replace(/^[ \t]+/, '').replace(/[ \t]{2,}/g, ' '),
  );
}

function normalize(input: string, applyNormalizews: boolean): string {
  const text = normalizeCRLF(input);
  let lines = text.split('\n');

  lines = stripTrailingWhitespace(lines);

  if (applyNormalizews) {
    lines = collapseInternalWhitespace(lines);
  }

  lines = collapseBlankLines(lines);
  lines = trimLeadingTrailingBlankLines(lines);

  return lines.join('\n');
}

export const WhitespaceNormalizeBoxSource = {
  defaultDisabled: true,
  name: 'Normalize Whitespace',
  description:
    'Trim trailing spaces per line, collapse multiple blank lines to one, and strip leading/trailing blank lines.',
  defaultInput: 'foo   \n\n\n  bar  \n\n ::trimlines',
  tag: '#',
  kind: 'Transform',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'trimlines', 'normalizews')) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    const applyNormalizews = hasOptionKeys(options, 'normalizews');
    const output = normalize(input, applyNormalizews);

    return [
      new BoxBuilder('Normalize Whitespace', output)
        .setTemplate(CodeBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default WhitespaceNormalizeBoxSource;
