import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

export const TextReverseBoxSource = {
  name: 'Text Reverse',
  description:
    'Reverse the characters of the input string (Unicode code-point aware).',
  defaultInput: 'hello 😀 ::reverse',
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

    // iterate by code point so surrogate pairs (emoji, astral chars) stay intact
    const reversed = [...input].reverse().join('');

    return [
      new BoxBuilder('Text Reverse', reversed)
        .setTemplate(DefaultBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default TextReverseBoxSource;
