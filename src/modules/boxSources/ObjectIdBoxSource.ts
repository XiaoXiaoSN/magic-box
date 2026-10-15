import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import {
  BoxBuilder,
  errorBox,
  extractOptionKeys,
  hasOptionKeys,
} from '@modules/Box';

import { formatIdSeconds } from './idTime';

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

function candidateFrom(input: string, options: BoxOptions): string {
  const option = extractOptionKeys(options, 'objectid', 'object-id');
  if (typeof option === 'string' && option.trim() !== '') {
    return option.trim();
  }
  return trim(input);
}

function invalidBox(): Box {
  return errorBox(
    'ObjectId',
    'Invalid ObjectId: expected exactly 24 hexadecimal characters.',
  );
}

export const ObjectIdBoxSource = {
  defaultDisabled: true,
  name: 'ObjectId',
  description:
    'Decode a MongoDB ObjectId timestamp, random value, and counter with ::objectid.',
  defaultInput: '507f1f77bcf86cd799439011\n::objectid',
  tag: '#',
  kind: 'Analyze',

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'objectid', 'object-id')) return [];

    const candidate = candidateFrom(input, options);
    if (!OBJECT_ID_PATTERN.test(candidate)) return [invalidBox()];

    const normalized = candidate.toLowerCase();
    const seconds = BigInt(`0x${normalized.slice(0, 8)}`);
    const timestamp = formatIdSeconds(seconds);
    if (timestamp === null) return [invalidBox()];

    const values: Record<string, string> = {
      ObjectId: normalized,
      Timestamp: timestamp.iso,
      'Unix (s)': seconds.toString(),
      Random: normalized.slice(8, 18),
      Counter: String(Number.parseInt(normalized.slice(18), 16)),
    };
    const plaintext = Object.entries(values)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    return [
      new BoxBuilder('ObjectId', plaintext)
        .setView('keyValue')
        .setOptions(values)

        .build(),
    ];
  },
};

export const ObjectIDBoxSource = ObjectIdBoxSource;
export default ObjectIdBoxSource;
