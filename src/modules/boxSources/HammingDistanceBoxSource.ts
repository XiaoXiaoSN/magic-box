import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 20_000;

export const HammingDistanceBoxSource = {
  name: 'Hamming Distance',
  description:
    'Hamming distance between two equal-length strings (newline-separated, by UTF-16 code unit).',
  defaultInput: 'karolin\nkathrin ::hamming',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'hamming')) return [];
    if (!isString(input) || input.length > MAX_INPUT) return [];

    // split on the first newline only
    const newlineIdx = input.indexOf('\n');

    if (newlineIdx === -1) {
      return [
        new BoxBuilder(
          'Hamming Distance',
          'Two newline-separated strings are required.',
        )
          .setTemplate(KeyValueBoxTemplate)
          .setOptions({
            Info: 'Two newline-separated strings are required.',
          })
          .setPriority(this.priority)
          .build(),
      ];
    }

    const a = input.slice(0, newlineIdx);
    const b = input.slice(newlineIdx + 1);

    if (a.length !== b.length) {
      return [
        new BoxBuilder(
          'Hamming Distance',
          `Hamming distance requires equal-length strings (got ${a.length} and ${b.length}).`,
        )
          .setTemplate(KeyValueBoxTemplate)
          .setOptions({
            Info: `Hamming distance requires equal-length strings (got ${a.length} and ${b.length}).`,
          })
          .setPriority(this.priority)
          .build(),
      ];
    }

    // count positions where code units differ
    let distance = 0;
    for (let i = 0; i < a.length; i++) {
      if (a.charCodeAt(i) !== b.charCodeAt(i)) {
        distance++;
      }
    }

    const length = a.length;
    const similarity = length === 0 ? 1 : 1 - distance / length;

    const similarityPct = `${(similarity * 100).toFixed(1)}%`;

    const kv: Record<string, string> = {
      Distance: String(distance),
      Length: String(length),
      Similarity: similarityPct,
    };

    // plaintext k:v lines for copy/headless use
    const plaintext = Object.entries(kv)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('Hamming Distance', plaintext)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kv)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default HammingDistanceBoxSource;
