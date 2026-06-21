import { CodeBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;
const DEFAULT_WIDTH = 80;
const MAX_WIDTH = 1000;

// wrap a single line at word boundaries so no output line exceeds `width`.
// words longer than `width` are kept on their own line without being split.
// leading indentation is preserved on the first wrapped sub-line.
function wrapLine(line: string, width: number): string {
  const indent = line.match(/^[ \t]*/)?.[0] ?? '';
  const rest = line.slice(indent.length);
  if (rest === '') return line;

  const words = rest.split(/\s+/).filter((w) => w.length > 0);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (current === '') {
      current = word;
    } else if (current.length + 1 + word.length <= width) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current !== '') {
    lines.push(current);
  }

  // keep the original indentation on the first line
  return lines.map((l, i) => (i === 0 ? indent + l : l)).join('\n');
}

// resolve the target column width from options, falling back to DEFAULT_WIDTH.
function resolveWidth(options: BoxOptions): number {
  const raw = extractOptionKeys(options, 'wrap', 'wordwrap');

  if (raw === null || raw === true) {
    return DEFAULT_WIDTH;
  }

  const parsed = Number.parseInt(String(raw), 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_WIDTH;
  }

  return Math.min(parsed, MAX_WIDTH);
}

export const WordWrapBoxSource = {
  name: 'Word Wrap',
  description:
    'Wrap text to a column width at word boundaries. Use ::wrap=N for width N (default 80).',
  defaultInput: 'The quick brown fox jumps over the lazy dog ::wrap=20',
  tag: '#',
  kind: 'Transform',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'wrap', 'wordwrap')) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    const width = resolveWidth(options);

    // wrap each existing line independently to preserve user newlines / paragraphs
    const output = input
      .split('\n')
      .map((line) => wrapLine(line, width))
      .join('\n');

    return [
      new BoxBuilder('Word Wrap', output)
        .setTemplate(CodeBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default WordWrapBoxSource;
