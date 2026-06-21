import { CodeBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// strip markdown formatting from a string, returning plain text
function stripMarkdown(text: string): string {
  let result = text;

  // remove fenced code blocks (``` ... ```) — keep inner content, drop fence lines
  result = result.replace(/^```.*$/gm, '');

  // remove ATX headings: leading # characters at line start
  result = result.replace(/^#{1,6}\s+/gm, '');

  // remove images before links so the pattern doesn't conflict
  result = result.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');

  // remove links: [text](url) → text
  result = result.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');

  // remove strikethrough: ~~x~~ → x
  result = result.replace(/~~([^~]*)~~/g, '$1');

  // remove bold: **x** or __x__ → x
  result = result.replace(/(\*\*|__)([^*_]*)(\*\*|__)/g, '$2');

  // remove italic: *x* or _x_ → x (after bold so ** is already gone)
  result = result.replace(/(\*|_)([^*_]*)(\*|_)/g, '$2');

  // remove inline code: `x` → x
  result = result.replace(/`([^`]*)`/g, '$1');

  // remove blockquote markers: leading > at line start
  result = result.replace(/^>\s?/gm, '');

  // remove unordered list markers: leading - * + at line start
  result = result.replace(/^[-*+]\s+/gm, '');

  // remove ordered list markers: leading 1. 2. etc. at line start
  result = result.replace(/^\d+\.\s+/gm, '');

  // remove horizontal rules: lines consisting solely of --- or ***
  result = result.replace(/^[-*]{3,}$/gm, '');

  // collapse multiple blank lines into one and trim overall
  result = result.replace(/\n{3,}/g, '\n\n');
  return trim(result);
}

export const MarkdownStripBoxSource = {
  name: 'Markdown Strip',
  description: 'Strip common Markdown formatting, leaving plain text.',
  defaultInput: '# Title\n\n**bold** and _italic_ and `code` ::stripmd',
  tag: '#',
  kind: 'Transform',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'stripmd', 'markdownstrip')) return [];
    if (
      !isString(input) ||
      trim(input).length === 0 ||
      input.length > MAX_INPUT
    )
      return [];

    const stripped = stripMarkdown(input);

    return [
      new BoxBuilder('Markdown Strip', stripped)
        .setTemplate(CodeBoxTemplate)
        .setShowExpandButton(true)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default MarkdownStripBoxSource;
