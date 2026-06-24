import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// max caps prevent pathological inputs from blocking the event loop
const MAX_COUNT = 1000;
const MAX_SIDES = 1_000_000;

const NOTATION_RE = /^(\d*)d(\d+)([+-]\d+)?$/i;

interface ParsedNotation {
  count: number;
  sides: number;
  modifier: number;
  raw: string;
}

/** Parses XdY+Z dice notation. Returns null when the string is not valid notation. */
function parseNotation(raw: string): ParsedNotation | null {
  const match = NOTATION_RE.exec(raw.trim());
  if (!match) return null;

  const count = match[1] === '' ? 1 : Number.parseInt(match[1], 10);
  const sides = Number.parseInt(match[2], 10);
  const modifier = match[3] ? Number.parseInt(match[3], 10) : 0;

  if (sides < 1 || count < 1) return null;

  return {
    count: Math.min(count, MAX_COUNT),
    sides: Math.min(sides, MAX_SIDES),
    modifier,
    raw,
  };
}

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

/** Formats a modifier as a signed string, or '0' if zero. */
function formatModifier(modifier: number): string {
  if (modifier === 0) return '0';
  return modifier > 0 ? `+${modifier}` : `${modifier}`;
}

const INVALID_BOX_OUTPUT =
  'Dice Roll requires valid dice notation, e.g. 2d6+3 or 1d20.';

export const DiceRollBoxSource = {
  defaultDisabled: true,
  name: 'Dice Roll',
  description:
    'Roll dice with standard notation, e.g. 2d6+3 or 1d20. ::roll or ::roll=3d8.',
  defaultInput: '2d6+3 ::roll',
  tag: '#',
  kind: 'Generate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'roll', 'dice')) return [];

    // prefer explicit notation from the option value; fall back to the input string
    const optionValue = extractOptionKeys(options, 'roll', 'dice');
    const notationRaw =
      typeof optionValue === 'string' && optionValue.trim() !== ''
        ? optionValue.trim()
        : trim(input);

    const parsed = parseNotation(notationRaw);

    if (!parsed) {
      const kvOptions: Record<string, string> = {
        Info: INVALID_BOX_OUTPUT,
      };
      const plaintext = `Info: ${INVALID_BOX_OUTPUT}`;
      return [
        new BoxBuilder('Dice Roll', plaintext)
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(kvOptions)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const rolls = rollDice(parsed.count, parsed.sides);
    const sum = rolls.reduce((a, b) => a + b, 0);
    const total = sum + parsed.modifier;
    const modifierStr = formatModifier(parsed.modifier);

    // reconstruct from capped values so the label matches what was rolled
    const effectiveNotation = `${parsed.count}d${parsed.sides}${modifierStr === '0' ? '' : modifierStr}`;

    const kvOptions: Record<string, string> = {
      Notation: effectiveNotation,
      Rolls: `[${rolls.join(', ')}]`,
      Sum: String(sum),
      Modifier: modifierStr,
      Total: String(total),
    };

    const plaintext = Object.entries(kvOptions)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('Dice Roll', plaintext)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kvOptions)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default DiceRollBoxSource;
