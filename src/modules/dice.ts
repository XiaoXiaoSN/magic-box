/** samples an unbiased integer in [1, sides] with rejection sampling. */
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

/** rolls six-sided dice, using crypto when available. */
export function rollDice(count: number): number[] {
  const sides = 6;
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

export function diceOptions(rolls: number[]): Record<string, string> {
  return {
    Dice: String(rolls.length),
    Rolls: JSON.stringify(rolls),
    Total: String(rolls.reduce((sum, value) => sum + value, 0)),
  };
}

export function dicePlaintext(options: Record<string, string>): string {
  return Object.entries(options)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
}
