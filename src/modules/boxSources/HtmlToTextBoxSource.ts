import { CodeBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// named entity table for the most common HTML entities
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  '#39': "'",
  nbsp: ' ',
};

// decode a single HTML entity reference (without the surrounding & and ;)
function decodeEntity(ref: string): string {
  const lower = ref.toLowerCase();

  // numeric decimal: &#NN;
  if (lower.startsWith('#x')) {
    const cp = Number.parseInt(ref.slice(2), 16);
    return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : '';
  }
  if (ref.startsWith('#')) {
    const cp = Number.parseInt(ref.slice(1), 10);
    return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : '';
  }

  return NAMED_ENTITIES[lower] ?? NAMED_ENTITIES[ref] ?? `&${ref};`;
}

// convert html to readable plain text using pure string processing
function htmlToText(html: string): string {
  let text = html;

  // remove <script> blocks entirely (content included)
  text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

  // remove <style> blocks entirely (content included)
  text = text.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');

  // convert <br> variants to newlines
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // convert block-closing tags to newlines so paragraphs separate naturally
  text = text.replace(/<\/(?:p|div|li|h[1-6]|tr)>/gi, '\n');

  // prefix list items with a dash
  text = text.replace(/<li\b[^>]*>/gi, '- ');

  // strip all remaining tags — [^>]* is linear (no nested quantifiers)
  text = text.replace(/<[^>]*>/g, '');

  // decode HTML entities
  text = text.replace(/&([#a-zA-Z0-9]+);/g, (_, ref: string) =>
    decodeEntity(ref),
  );

  // trim trailing whitespace on each line
  text = text
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n');

  // collapse runs of 3+ newlines down to 2
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

export const HtmlToTextBoxSource = {
  name: 'HTML to Text',
  description:
    'Strip HTML tags and decode entities to plain text. ::striptags or ::htmltotext.',
  defaultInput: '<p>Hello <b>world</b>!</p> ::striptags',
  tag: '#',
  kind: 'Transform',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'striptags', 'htmltotext')) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    const result = htmlToText(input);

    return [
      new BoxBuilder('HTML to Text', result)
        .setTemplate(CodeBoxTemplate)
        .setPriority(Priority)
        .build(),
    ];
  },
};

export default HtmlToTextBoxSource;
