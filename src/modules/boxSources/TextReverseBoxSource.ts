import { isString } from '@functions/helper';
import { graphemes } from '@functions/unicode';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

export const TextReverseBoxSource = {
  defaultDisabled: true,
  name: 'Text Reverse',
  description:
    'Reverse the characters of the input string without splitting grapheme clusters.',
  defaultInput: 'hello 😀\n::reverse',
  tag: '#',
  kind: 'Transform',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'reverse', 'reversetext')) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    const reversed = graphemes(input).reverse().join('');

    return [
      new BoxBuilder('Text Reverse', reversed)
        .setView('default')
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default TextReverseBoxSource;
