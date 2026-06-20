import { CodeBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// map of the most common HTML entities to their decoded characters;
// &amp; must be decoded last to avoid double-decoding
const ENTITY_MAP: [RegExp, string][] = [
  [/&lt;/g, '<'],
  [/&gt;/g, '>'],
  [/&quot;/g, '"'],
  [/&#39;|&apos;/g, "'"],
  [/&nbsp;/g, ' '],
  [/&amp;/g, '&'],
];

// [^>]* is a negated character class — linear, no catastrophic backtracking
const TAG_REGEX = /<[^>]*>/g;

function decodeEntities(text: string): string {
  let result = text;
  for (const [pattern, replacement] of ENTITY_MAP) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function stripTags(input: string): string {
  return trim(decodeEntities(input.replace(TAG_REGEX, '')));
}

export const StripTagsBoxSource = {
  name: 'Strip HTML Tags',
  description: 'Remove HTML tags, returning the plain text content.',
  defaultInput: '<p>Hello <b>world</b></p> ::striptags',
  tag: '#',
  kind: 'Transform',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'striptags', 'striphtml')) return [];
    if (
      !isString(input) ||
      trim(input).length === 0 ||
      input.length > MAX_INPUT
    )
      return [];

    const stripped = stripTags(input);

    return [
      new BoxBuilder('Strip HTML Tags', stripped)
        .setTemplate(CodeBoxTemplate)
        .setShowExpandButton(true)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default StripTagsBoxSource;
