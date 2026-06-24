import { CodeBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

export const JsonMinifyBoxSource = {
  defaultDisabled: true,
  name: 'JSON Minify',
  description:
    'Minify a JSON document by removing all insignificant whitespace.',
  defaultInput: '{ "a": 1, "b": [1, 2, 3] } ::jsonmin',
  tag: '#',
  kind: 'Transform',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'jsonmin', 'minifyjson')) return [];
    if (input.length > MAX_INPUT) return [];

    const trimmed = trim(input);
    if (trimmed === '') return [];

    try {
      const parsed = JSON.parse(trimmed);
      const minified = JSON.stringify(parsed);
      return [
        new BoxBuilder('JSON Minify', minified)
          .setTemplate(CodeBoxTemplate)
          .setShowExpandButton(true)
          .setPriority(this.priority)
          .build(),
      ];
    } catch {
      // input is not valid JSON — surface a descriptive error box
      return [
        new BoxBuilder(
          'JSON Minify',
          'Invalid JSON: unable to parse the input.',
        )
          .setTemplate(CodeBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }
  },
};

export default JsonMinifyBoxSource;
