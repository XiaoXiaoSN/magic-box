import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import {
  BoxBuilder,
  errorBox,
  extractOptionKeys,
  hasOptionKeys,
} from '@modules/Box';

import { formatIdSeconds } from './idTime';

const Priority = 10;
const KSUID_ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const KSUID_PATTERN = /^[0-9A-Za-z]{27}$/;
const KSUID_MAX = (1n << 160n) - 1n;
const KSUID_EPOCH = 1_400_000_000n;

function decodeBase62(value: string): bigint | null {
  let decoded = 0n;
  for (const character of value) {
    const digit = KSUID_ALPHABET.indexOf(character);
    if (digit < 0) return null;
    decoded = decoded * 62n + BigInt(digit);
  }
  return decoded <= KSUID_MAX ? decoded : null;
}

function invalidBox(priority: number): Box {
  return errorBox(
    'KSUID',
    'Invalid KSUID: expected exactly 27 base62 characters in the 160-bit range.',
    { priority },
  );
}

export const KsuidBoxSource = {
  defaultDisabled: true,
  name: 'KSUID',
  description: 'Decode a KSUID timestamp and 128-bit payload with ::ksuid.',
  defaultInput: '0ujtsYcgvSTl8PAuAdqWYSMnLOv\n::ksuid',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'ksuid')) return [];

    const option = extractOptionKeys(options, 'ksuid');
    const candidate =
      typeof option === 'string' && option.trim() !== ''
        ? option.trim()
        : trim(input);
    if (!KSUID_PATTERN.test(candidate)) return [invalidBox(this.priority)];

    const decoded = decodeBase62(candidate);
    if (decoded === null) return [invalidBox(this.priority)];

    const seconds = (decoded >> 128n) + KSUID_EPOCH;
    const timestamp = formatIdSeconds(seconds);
    if (timestamp === null) return [invalidBox(this.priority)];

    const payload = decoded & ((1n << 128n) - 1n);
    const values: Record<string, string> = {
      KSUID: candidate,
      Timestamp: timestamp.iso,
      'Unix (s)': seconds.toString(),
      Payload: payload.toString(16).padStart(32, '0'),
    };
    const plaintext = Object.entries(values)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    return [
      new BoxBuilder('KSUID', plaintext)
        .setView('keyValue')
        .setOptions(values)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export const KSUIDBoxSource = KsuidBoxSource;
export default KsuidBoxSource;
