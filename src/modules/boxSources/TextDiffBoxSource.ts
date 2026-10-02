import { CodeBoxTemplate } from '@components/BoxTemplate';
import DiffBoxTemplate from '@components/BoxTemplate/DiffBoxTemplate';
import { isString } from '@functions/helper';
import { computeDiff } from '@functions/textDiff';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

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
    if (!isString(input) || input.length > 20_000) return [];
    if (hasOptionKeys(options, 'diff')) {
      const language = extractOptionKeys(options, 'lang', 'language', 'l');
      return [
        new BoxBuilder('Text Diff', '')
          .setSourceInput(input)
          .setOptions({
            language: typeof language === 'string' ? language : 'plaintext',
            diffTarget: '',
          })
          .setTemplate(DiffBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }
    const result = computeDiff(input);
    return [
      new BoxBuilder('Text Diff', result.ok ? result.output : result.message)
        .setOptions({ language: result.ok ? 'diff' : 'plaintext' })
        .setTemplate(CodeBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default TextDiffBoxSource;
