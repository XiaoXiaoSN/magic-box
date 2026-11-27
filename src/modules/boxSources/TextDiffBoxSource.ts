import { isString } from '@functions/helper';
import { compareJson } from '@functions/json/diff';
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
    'Compare two texts with ::diff, compare JSON with ::jsondiff, or separate two texts with --- and use ::textdiff.',
  defaultInput: 'foo\nbar\n---\nfoo\nbaz\n::textdiff',
  tag: '#',
  kind: 'Analyze',

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'diff', 'jsondiff', 'textdiff', 'linediff'))
      return [];
    if (!isString(input)) return [];
    if (input.length > MAX_INPUT) {
      return [
        errorBox(
          'Text Diff',
          `Input is too large (${input.length} characters, limit ${MAX_INPUT}).`,
        ),
      ];
    }
    const jsonDiff = hasOptionKeys(options, 'jsondiff');
    const separator = jsonDiff ? /^---[\t ]*\r?$/m.exec(input) : null;
    if (separator) {
      const before = input.slice(0, separator.index);
      const after = input.slice(separator.index + separator[0].length);
      const result = compareJson(before, after);
      const exportPatch = options?.jsondiff === 'patch';
      return result.ok
        ? [
            new BoxBuilder(
              exportPatch ? 'JSON Patch' : 'JSON Diff',
              exportPatch ? result.patch : result.output,
            )
              .setOptions({ language: 'json' })
              .setView('code')
              .build(),
          ]
        : [errorBox('JSON Diff', result.message)];
    }
    if (jsonDiff || hasOptionKeys(options, 'diff')) {
      const language = extractOptionKeys(options, 'lang', 'language', 'l');
      return [
        new BoxBuilder(jsonDiff ? 'JSON Diff' : 'Text Diff', '')
          .setSourceInput(input)
          .setOptions({
            language: jsonDiff
              ? 'json'
              : typeof language === 'string'
                ? language
                : 'plaintext',
            ...(jsonDiff ? { jsonDiff: true } : {}),
            diffTarget: '',
          })
          .setView('diff')

          .build(),
      ];
    }
    const result = computeDiff(input.replace(/\r\n?/g, '\n'));
    return [
      new BoxBuilder('Text Diff', result.ok ? result.output : result.message)
        .setIsError(!result.ok)
        .setOptions({ language: result.ok ? 'diff' : 'plaintext' })
        .setView('code')

        .build(),
    ];
  },
};

export default TextDiffBoxSource;
