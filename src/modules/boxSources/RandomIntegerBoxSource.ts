import { isString, trim } from '@functions/helper';
import type { Box } from '@modules/Box';
import { BoxBuilder, errorBox } from '@modules/Box';

const PriorityRandomBox = 10;
const DEFAULT_MIN = 0;
const DEFAULT_MAX = 100;
const MAX_SAFE_INTEGER_TEXT = String(Number.MAX_SAFE_INTEGER);

interface Match {
  min: number;
  max: number;
}

interface ParsedMatch {
  match: Match | null;
  error: string | null;
}

const MAX_SAFE_INTEGER_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

function exceedsSafeInteger(value: string): boolean {
  const normalized = value.replace(/^0+(?=\d)/, '');
  return (
    normalized.length > MAX_SAFE_INTEGER_TEXT.length ||
    (normalized.length === MAX_SAFE_INTEGER_TEXT.length &&
      normalized > MAX_SAFE_INTEGER_TEXT)
  );
}

function parseMatch(input: string): ParsedMatch {
  if (!isString(input)) {
    return { match: null, error: null };
  }
  if (input === '' || trim(input) === '') {
    return { match: null, error: null };
  }

  const regularInput = trim(input);

  // match pattern like "random 0-100", "random 0~100", "random 100", or just "random".
  const match = /^random(?:\s+(\d+)(?:\s*[-~]?\s*(\d+))?)?$/i.exec(
    regularInput,
  );
  if (!match) {
    return { match: null, error: null };
  }

  if (!match[1] && !match[2]) {
    return { match: { min: DEFAULT_MIN, max: DEFAULT_MAX }, error: null };
  }

  if (
    exceedsSafeInteger(match[1]) ||
    (match[2] !== undefined && exceedsSafeInteger(match[2]))
  ) {
    return {
      match: null,
      error: `Bounds must not exceed Number.MAX_SAFE_INTEGER (${Number.MAX_SAFE_INTEGER}).`,
    };
  }

  const first = BigInt(match[1]);
  const second = match[2] === undefined ? null : BigInt(match[2]);
  const largest = second === null ? first : second;
  if (first > MAX_SAFE_INTEGER_BIGINT || largest > MAX_SAFE_INTEGER_BIGINT) {
    return {
      match: null,
      error: `Bounds must not exceed Number.MAX_SAFE_INTEGER (${Number.MAX_SAFE_INTEGER}).`,
    };
  }

  if (second === null) {
    // Keep the historical rejection for "random 0" while allowing the useful 0–1 range.
    if (first === 0n) return { match: null, error: null };
    return { match: { min: DEFAULT_MIN, max: Number(first) }, error: null };
  }

  const min = Number(first < second ? first : second);
  const max = Number(first < second ? second : first);
  return { match: { min, max }, error: null };
}

function randomBelow(limit: bigint): bigint {
  if (limit === 1n) return 0n;

  const bits = (limit - 1n).toString(2).length;
  const byteCount = Math.ceil(bits / 8);
  const excessBits = byteCount * 8 - bits;
  const firstByteMask = 0xff >> excessBits;
  const bytes = new Uint8Array(byteCount);

  while (true) {
    crypto.getRandomValues(bytes);
    bytes[0] &= firstByteMask;

    let candidate = 0n;
    for (const byte of bytes) {
      candidate = (candidate << 8n) | BigInt(byte);
    }
    if (candidate < limit) return candidate;
  }
}

export const RandomIntegerBoxSource = {
  name: 'Random Integer',
  description: 'Generate a random integer in a range of your choosing.',
  defaultInput: 'random 1-6',
  tag: '⚂',
  kind: 'Generate',
  priority: PriorityRandomBox,

  checkMatch(input: string): Match | undefined {
    return parseMatch(input).match ?? undefined;
  },

  async generateBoxes(input: string): Promise<Box[]> {
    const parsed = parseMatch(input);
    if (parsed.error !== null) {
      return [
        errorBox('Random Integer', parsed.error, { priority: this.priority }),
      ];
    }

    const match = parsed.match;
    if (!match) {
      return [];
    }

    const min = BigInt(match.min);
    const max = BigInt(match.max);
    const randomInRange = min + randomBelow(max - min + 1n);

    return [
      new BoxBuilder('Random Number', randomInRange.toString())
        .setOptions({
          min: match.min.toString(),
          max: match.max.toString(),
        })
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default RandomIntegerBoxSource;
