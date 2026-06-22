import { CodeBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// compute the length of the common leading-space prefix across all non-empty lines
function commonLeadingSpaces(lines: string[]): number {
  const nonEmpty = lines.filter((l) => l.length > 0);
  if (nonEmpty.length === 0) return 0;

  let min = Number.POSITIVE_INFINITY;
  for (const line of nonEmpty) {
    let count = 0;
    while (count < line.length && line[count] === ' ') {
      count++;
    }
    if (count < min) min = count;
  }
  return min === Number.POSITIVE_INFINITY ? 0 : min;
}

// apply indentation: positive n prepends spaces, negative n removes leading spaces
function applyIndent(lines: string[], n: number): string[] {
  if (n === 0) return lines;

  if (n > 0) {
    const pad = ' '.repeat(n);
    return lines.map((line) => (line.length === 0 ? line : pad + line));
  }

  // dedent: remove up to |n| leading spaces per line
  const remove = -n;
  return lines.map((line) => {
    let i = 0;
    while (i < remove && i < line.length && line[i] === ' ') {
      i++;
    }
    return line.slice(i);
  });
}

export const TextIndentBoxSource = {
  name: 'Indent',
  description:
    'Indent every line by N spaces (::indent=<n>) or dedent (::dedent / ::indent=-<n>).',
  defaultInput: 'line one\nline two ::indent=2',
  tag: '#',
  kind: 'Transform',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantIndent = hasOptionKeys(options, 'indent');
    const wantDedent = hasOptionKeys(options, 'dedent');
    if (!wantIndent && !wantDedent) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    // normalize line endings
    const normalized = (input as string)
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
    const lines = normalized.split('\n');

    let amount: number;

    if (wantIndent) {
      const raw = extractOptionKeys(options, 'indent');
      if (raw === true || raw === null) {
        // ::indent with no value defaults to 2
        amount = 2;
      } else {
        const parsed = Number.parseInt(raw as string, 10);
        amount = Number.isNaN(parsed)
          ? 2
          : Math.max(-1000, Math.min(1000, parsed));
      }
    } else {
      // ::dedent branch
      const raw = extractOptionKeys(options, 'dedent');
      if (raw === true || raw === null) {
        // auto-dedent: remove the common leading whitespace prefix
        amount = -commonLeadingSpaces(lines);
      } else {
        const parsed = Number.parseInt(raw as string, 10);
        const fixed = Number.isNaN(parsed)
          ? 0
          : Math.max(0, Math.min(1000, parsed));
        amount = -fixed;
      }
    }

    const result = applyIndent(lines, amount).join('\n');

    return [
      new BoxBuilder('Indent', result)
        .setTemplate(CodeBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default TextIndentBoxSource;
