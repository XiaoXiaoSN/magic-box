import { isString } from '@functions/helper';
import { computeDiff } from '@functions/textDiff';
import type { Box, BoxOptions } from '@modules/Box';
import {
  BoxBuilder,
  errorBox,
  extractOptionKeys,
  hasOptionKeys,
} from '@modules/Box';

const MAX_INPUT = 20_000;

export const TextDiffBoxSource = {
  name: 'Text Diff',
  description:
    'Paste a second text with ::diff, or separate two texts with --- and use ::textdiff.',
  defaultInput: 'foo\nbar\n::diff\n::lang=yaml',
  tag: '#',
  kind: 'Analyze',
  priority: 10,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'diff', 'textdiff', 'linediff')) return [];
    if (!isString(input)) return [];
    if (input.length > MAX_INPUT) {
      return [
        errorBox(
          'Text Diff',
          `Input is too large (${input.length} characters, limit ${MAX_INPUT}).`,
          { priority: this.priority },
        ),
      ];
    }
    if (hasOptionKeys(options, 'diff')) {
      const language = extractOptionKeys(options, 'lang', 'language', 'l');
      return [
        new BoxBuilder('Text Diff', '')
          .setSourceInput(input)
          .setOptions({
            language: typeof language === 'string' ? language : 'plaintext',
            diffTarget: '',
          })
          .setView('diff')
          .setPriority(this.priority)
          .build(),
      ];
    }
    const result = computeDiff(input.replace(/\r\n?/g, '\n'));
    return [
      new BoxBuilder('Text Diff', result.ok ? result.output : result.message)
        .setOptions({ language: result.ok ? 'diff' : 'plaintext' })
        .setView('code')
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default TextDiffBoxSource;
