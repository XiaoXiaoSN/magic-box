import { CodeBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// strip markdown formatting to plain text, line by line where appropriate
function stripMarkdown(input: string): string {
  // remove code fence delimiters (``` or ~~~), keep inner content
  const lines = input.split('\n');
  const processedLines: string[] = [];
  let inCodeFence = false;

  for (const line of lines) {
    if (/^(`{3,}|~{3,})/.test(line)) {
      inCodeFence = !inCodeFence;
      // skip the fence line itself
      continue;
    }
    if (inCodeFence) {
      processedLines.push(line);
      continue;
    }
    processedLines.push(processLine(line));
  }

  return processedLines.join('\n');
}

// apply all inline and block-level stripping to a single line
function processLine(line: string): string {
  // horizontal rules: lines of only dashes, asterisks, underscores (with optional spaces)
  if (/^(\s*[-*_]){3,}\s*$/.test(line)) {
    return '';
  }

  // atx headings: remove leading hashes
  let result = line.replace(/^#{1,6}\s+/, '');

  // blockquotes: remove leading '> '
  result = result.replace(/^>\s?/, '');

  // ordered list markers: '1. ', '2. ', etc.
  result = result.replace(/^\s*\d+\.\s+/, '');

  // unordered list markers: '- ', '* ', '+ ' — keep the '- ' prefix for unordered lists
  // we normalise all markers to '- ' to preserve the list structure
  result = result.replace(/^(\s*)[-*+]\s+/, '$1- ');

  // images before links so '![alt](url)' is handled first
  result = result.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');

  // links: '[text](url)' → 'text'
  result = result.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');

  // strikethrough: '~~text~~' → 'text'
  result = result.replace(/~~([^~]+)~~/g, '$1');

  // inline code: '`code`' → 'code' (backtick-delimited, no backtick inside)
  result = result.replace(/`([^`]+)`/g, '$1');

  // bold: '**text**' or '__text__' → 'text'
  // use backreference to match same delimiter; non-greedy middle
  result = result.replace(/(\*\*|__)(.+?)\1/g, '$2');

  // italic: '*text*' or '_text_' → 'text'
  // only run after bold so we don't partially match bold markers
  result = result.replace(/(\*|_)(.+?)\1/g, '$2');

  return result;
}

export const MarkdownStripBoxSource = {
  name: 'Markdown to Text',
  description:
    'Strip Markdown formatting to plain text. ::stripmd or ::mdtotext.',
  defaultInput: '# Title\n\n**bold** and *italic* and `code` ::stripmd',
  tag: '#',
  kind: 'Transform',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'stripmd', 'mdtotext')) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    const plainText = stripMarkdown(input);

    return [
      new BoxBuilder('Markdown to Text', plainText)
        .setTemplate(CodeBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default MarkdownStripBoxSource;
