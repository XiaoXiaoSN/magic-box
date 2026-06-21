import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// MDN-recommended pattern: escapes all regex metacharacters with a backslash
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const RegexEscapeBoxSource = {
  name: 'Regex Escape',
  description:
    'Escape a literal string so it can be used inside a regular expression.',
  defaultInput: 'a.b*c (x?) ::regexescape',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'regexescape', 'reescape')) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    const escaped = escapeRegex(input);

    return [
      new BoxBuilder('Regex Escape', escaped)
        .setTemplate(DefaultBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default RegexEscapeBoxSource;
