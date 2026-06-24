import { CodeBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;
const DEFAULT_WIDTH = 80;
const MIN_WIDTH = 1;
const MAX_WIDTH = 1000;

// greedy word-wrap a single line of text to the given column width.
// words longer than width are placed on their own line without breaking.
function wrapLine(line: string, width: number): string {
  const words = line.split(' ').filter((w) => w.length > 0);
  if (words.length === 0) return '';

  const result: string[] = [];
  let current = '';

  for (const word of words) {
    if (current.length === 0) {
      current = word;
    } else if (current.length + 1 + word.length <= width) {
      current = `${current} ${word}`;
    } else {
      result.push(current);
      current = word;
    }
  }
  if (current.length > 0) {
    result.push(current);
  }

  return result.join('\n');
}

// wrap text paragraph-by-paragraph, preserving blank lines as paragraph boundaries.
function wrapText(text: string, width: number): string {
  const lines = text.split('\n');
  return lines.map((line) => wrapLine(line, width)).join('\n');
}

function resolveWidth(raw: string | boolean | null): number {
  if (raw === null || raw === true || raw === false) return DEFAULT_WIDTH;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) return DEFAULT_WIDTH;
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, parsed));
}

export const TextWrapBoxSource = {
  defaultDisabled: true,
  name: 'Text Wrap',
  description: 'Word-wrap text to a column width. ::wrap=<width> (default 80).',
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

    const rawWidth = extractOptionKeys(options, 'wrap', 'wordwrap');
    const width = resolveWidth(rawWidth);
    const wrapped = wrapText(input, width);

    return [
      new BoxBuilder('Text Wrap', wrapped)
        .setTemplate(CodeBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default TextWrapBoxSource;
