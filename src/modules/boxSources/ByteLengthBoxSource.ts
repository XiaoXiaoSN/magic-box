import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// count grapheme clusters using Intl.Segmenter when available, fall back to code points
function countGraphemes(input: string): { count: number; fallback: boolean } {
  if (
    typeof Intl !== 'undefined' &&
    typeof (Intl as { Segmenter?: unknown }).Segmenter === 'function'
  ) {
    const segmenter = new Intl.Segmenter(undefined, {
      granularity: 'grapheme',
    });
    const count = [...segmenter.segment(input)].length;
    return { count, fallback: false };
  }
  return { count: [...input].length, fallback: true };
}

export const ByteLengthBoxSource = {
  name: 'Byte Length',
  description:
    'Count UTF-16 units, Unicode code points, UTF-8 bytes (and graphemes) of the input.',
  defaultInput: 'héllo 😀 ::bytelen',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'bytelen', 'bytelength', 'len')) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    const utf16Units = input.length;
    const codePoints = [...input].length;
    const utf8Bytes = new TextEncoder().encode(input).length;
    const { count: graphemes, fallback } = countGraphemes(input);

    const graphemeLabel = fallback
      ? 'Graphemes (approx, no Intl.Segmenter)'
      : 'Graphemes';

    const kvOptions: Record<string, string> = {
      'UTF-16 Units': String(utf16Units),
      'Code Points': String(codePoints),
      'UTF-8 Bytes': String(utf8Bytes),
      [graphemeLabel]: String(graphemes),
    };

    const box = new BoxBuilder('Byte Length', JSON.stringify(kvOptions))
      .setTemplate(KeyValueBoxTemplate)
      .setOptions(kvOptions)
      .setPriority(this.priority)
      .build();

    return [box];
  },
};

export default ByteLengthBoxSource;
