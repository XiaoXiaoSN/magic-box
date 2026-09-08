import { parseInput } from '@functions/parseOptions';
import type { BoxOptions } from '@modules/Box';
import { describe, expect, it, vi } from 'vitest';

import { DiceRollBoxSource } from '../DiceRollBoxSource';

describe('DiceRollBoxSource', () => {
  it('requires an explicit dice or roll option', async () => {
    expect(await DiceRollBoxSource.generateBoxes('3')).toEqual([]);
    expect(await DiceRollBoxSource.generateBoxes('3', { other: true })).toEqual(
      [],
    );
  });

  it.each<NonNullable<BoxOptions>>([
    { roll: true },
    { dice: true },
    { roll: '' },
  ])('defaults to one six-sided die with %o', async (options) => {
    const [box] = await DiceRollBoxSource.generateBoxes('', options);
    expect(box.props.options?.Dice).toBe('1');
    expect(JSON.parse(String(box.props.options?.Rolls))).toHaveLength(1);
  });

  it.each([
    1, 3, 20,
  ])('rolls exactly %i six-sided dice and preserves plaintext results', async (count) => {
    const [box] = await DiceRollBoxSource.generateBoxes(String(count), {
      roll: true,
    });
    const rolls: number[] = JSON.parse(String(box.props.options?.Rolls));
    expect(rolls).toHaveLength(count);
    expect(
      rolls.every((roll) => Number.isInteger(roll) && roll >= 1 && roll <= 6),
    ).toBe(true);
    expect(box.props.options?.Total).toBe(
      String(rolls.reduce((sum, roll) => sum + roll, 0)),
    );
    expect(box.props.plaintextOutput).toBe(
      `Dice: ${count}\nRolls: ${JSON.stringify(rolls)}\nTotal: ${box.props.options?.Total}`,
    );
  });

  it('prefers an explicit option count over the input', async () => {
    const [box] = await DiceRollBoxSource.generateBoxes('9', { dice: ' 3 ' });
    expect(box.props.options?.Dice).toBe('3');
  });

  it.each([
    '0',
    '-1',
    '21',
    '1.5',
    '2d6',
    '1d20+5',
    'abc',
    'Infinity',
    '1e1',
    '999999999999999999999',
  ])('rejects invalid count %s with a visible error template', async (input) => {
    const [box] = await DiceRollBoxSource.generateBoxes(input, { roll: true });
    expect(box.props.plaintextOutput).toContain('count from 1 to 20');
    expect(box.boxTemplate).toBeUndefined();
    expect(box.props.showExpandButton).toBe(false);
  });

  it.each([
    '::roll=3',
    '::dice=3',
    '3\n::roll',
  ])('accepts actual application input %s', async (raw) => {
    const [input, options] = parseInput(raw);
    const [box] = await DiceRollBoxSource.generateBoxes(input, options);
    expect(box.props.options?.Dice).toBe('3');
  });

  it('rejects biased uint32 samples and includes both endpoints', async () => {
    const random = vi
      .spyOn(crypto, 'getRandomValues')
      .mockImplementation((buffer) => {
        const samples = buffer as Uint32Array;
        samples.fill(0);
        samples[0] = 0xffffffff;
        samples[1] = 0;
        samples[2] = 5;
        return buffer;
      });
    try {
      const [box] = await DiceRollBoxSource.generateBoxes('2', { roll: true });
      expect(box.props.options?.Rolls).toBe('[1,6]');
    } finally {
      random.mockRestore();
    }
  });
});
