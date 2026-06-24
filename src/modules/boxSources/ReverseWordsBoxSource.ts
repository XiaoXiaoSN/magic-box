import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// split on runs of whitespace, reverse, and rejoin with a single space
function reverseWords(input: string): string {
  return trim(input).split(/\s+/).reverse().join(' ');
}

export const ReverseWordsBoxSource = {
  defaultDisabled: true,
  name: 'Reverse Words',
  description: 'Reverse the order of words in the input.',
  defaultInput: 'the quick brown fox ::reversewords',
  tag: '#',
  kind: 'Transform',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'reversewords')) return [];
    if (
      !isString(input) ||
      trim(input).length === 0 ||
      input.length > MAX_INPUT
    )
      return [];

    const output = reverseWords(input);

    return [
      new BoxBuilder('Reverse Words', output)
        .setTemplate(DefaultBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default ReverseWordsBoxSource;
