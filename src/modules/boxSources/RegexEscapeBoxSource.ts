import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

export const RegexEscapeBoxSource = {
  name: 'Regex Escape',
  description:
    'Escape regular-expression metacharacters so the input matches literally.',
  defaultInput: 'a.b*c(d) ::regexescape',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'regexescape', 'reescape')) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    // MDN-recommended pattern: escape all JS regex metacharacters
    const escaped = input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
