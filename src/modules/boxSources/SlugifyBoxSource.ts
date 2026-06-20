import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// every nonspacing combining mark (diacritics produced by NFKD decomposition);
// \p{Mn} covers Latin, Greek, Cyrillic and the extended/supplement blocks
const COMBINING_MARKS = /\p{Mn}/gu;

// converts text to a lowercase, hyphen-separated URL slug with diacritics removed
function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const SlugifyBoxSource = {
  name: 'Slugify',
  description:
    'Convert text into a lowercase, hyphen-separated URL slug (diacritics removed).',
  defaultInput: 'Héllo World! Foo_Bar ::slug',
  tag: '/',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'slug')) return [];
    if (!isString(input) || trim(input).length === 0) return [];

    const slug = slugify(input);

    // if the entire input collapses to empty after stripping non-latin chars, skip
    if (slug.length === 0) return [];

    return [
      new BoxBuilder('Slugify', slug)
        .setTemplate(DefaultBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default SlugifyBoxSource;
