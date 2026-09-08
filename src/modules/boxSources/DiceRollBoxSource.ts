import { DiceRollBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// bound the number of animated cubes and random samples per request
const MAX_COUNT = 20;

/** Returns a cryptographically unbiased integer in [1, sides] via rejection sampling. */
function rollOne(
  sides: number,
  buf: Uint32Array<ArrayBuffer>,
  cursor: { i: number },
): number {
  // largest multiple of `sides` that fits in a uint32 to avoid modulo bias
  const limit = Math.floor(0x1_0000_0000 / sides) * sides;
  for (;;) {
    if (cursor.i >= buf.length) {
      crypto.getRandomValues(buf);
      cursor.i = 0;
    }
    const val = buf[cursor.i++];
    if (val < limit) {
      return (val % sides) + 1;
    }
    // rejected — try next value
  }
}

/** Rolls `count` fair dice each with `sides` faces. Falls back to Math.random when crypto is unavailable. */
function rollDice(count: number, sides: number): number[] {
  const results: number[] = [];

  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.getRandomValues === 'function'
  ) {
    // over-allocate by a small factor to reduce refill frequency from rejection sampling
    const buf = new Uint32Array(Math.min(count + 16, 4096));
    crypto.getRandomValues(buf);
    const cursor = { i: 0 };
    for (let i = 0; i < count; i++) {
      results.push(rollOne(sides, buf, cursor));
    }
  } else {
    // fallback for environments without a secure context (e.g. some jest setups)
    for (let i = 0; i < count; i++) {
      results.push(Math.floor(Math.random() * sides) + 1);
    }
  }

  return results;
}

export const DiceRollBoxSource = {
  defaultDisabled: true,
  name: 'Dice Roll',
  description:
    'Roll six-sided dice. Specify a count from 1 to 20; defaults to 1. ::roll or ::dice=3.',
  defaultInput: '::roll',
  tag: '#',
  kind: 'Generate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'roll', 'dice')) return [];

    const optionValue = extractOptionKeys(options, 'roll', 'dice');
    const raw =
      typeof optionValue === 'string' && optionValue.trim() !== ''
        ? optionValue.trim()
        : trim(input);
    const count = raw === '' ? 1 : Number(raw);

    if (
      (raw !== '' && !/^\d+$/.test(raw)) ||
      !Number.isInteger(count) ||
      count < 1 ||
      count > MAX_COUNT
    ) {
      return [
        new BoxBuilder(
          'Dice Roll',
          'Enter a dice count from 1 to 20, e.g. ::roll=3. Every die has six sides.',
        )
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const rolls = rollDice(count, 6);
    const kvOptions: Record<string, string> = {
      Dice: String(count),
      Rolls: JSON.stringify(rolls),
      Total: String(rolls.reduce((a, b) => a + b, 0)),
    };

    const plaintext = Object.entries(kvOptions)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('Dice Roll', plaintext)
        .setTemplate(DiceRollBoxTemplate)
        .setOptions(kvOptions)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default DiceRollBoxSource;
