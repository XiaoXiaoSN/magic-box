import { describe, expect, it } from 'vitest';

import { DiceRollBoxSource } from '../DiceRollBoxSource';

describe('DiceRollBoxSource', () => {
  describe('generateBoxes', () => {
    it('should return [] when no roll/dice option is present', async () => {
      const boxes = await DiceRollBoxSource.generateBoxes('2d6');
      expect(boxes).toHaveLength(0);
    });

    it('should return [] when options is null', async () => {
      const boxes = await DiceRollBoxSource.generateBoxes('2d6', null);
      expect(boxes).toHaveLength(0);
    });

    it('should return [] when unrelated option is present', async () => {
      const boxes = await DiceRollBoxSource.generateBoxes('2d6', {
        other: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('should roll 2d6 and return values within range', async () => {
      const boxes = await DiceRollBoxSource.generateBoxes('2d6', {
        roll: true,
      });
      expect(boxes).toHaveLength(1);

      const { options } = boxes[0].props;
      expect(options?.Notation).toBe('2d6');

      const rollsRaw = options?.Rolls as string;
      // parse "[4, 2]" style string
      const rolls = JSON.parse(rollsRaw) as number[];
      expect(rolls).toHaveLength(2);
      for (const r of rolls) {
        expect(r).toBeGreaterThanOrEqual(1);
        expect(r).toBeLessThanOrEqual(6);
      }

      const total = Number(options?.Total);
      expect(total).toBeGreaterThanOrEqual(2);
      expect(total).toBeLessThanOrEqual(12);
      expect(options?.Modifier).toBe('0');
    });

    it('should handle 1d20+5 with modifier applied to total', async () => {
      const boxes = await DiceRollBoxSource.generateBoxes('1d20+5', {
        roll: true,
      });
      expect(boxes).toHaveLength(1);

      const { options } = boxes[0].props;
      expect(options?.Notation).toBe('1d20+5');
      expect(options?.Modifier).toBe('+5');

      const total = Number(options?.Total);
      expect(total).toBeGreaterThanOrEqual(6);
      expect(total).toBeLessThanOrEqual(25);
    });

    it('should use the option value as notation when ::roll=4d4', async () => {
      const boxes = await DiceRollBoxSource.generateBoxes('', {
        roll: '4d4',
      });
      expect(boxes).toHaveLength(1);

      const { options } = boxes[0].props;
      expect(options?.Notation).toBe('4d4');

      const rolls = JSON.parse(options?.Rolls as string) as number[];
      expect(rolls).toHaveLength(4);
      for (const r of rolls) {
        expect(r).toBeGreaterThanOrEqual(1);
        expect(r).toBeLessThanOrEqual(4);
      }
    });

    it('should default count to 1 when notation omits the count (d6)', async () => {
      const boxes = await DiceRollBoxSource.generateBoxes('d6', { roll: true });
      expect(boxes).toHaveLength(1);

      const { options } = boxes[0].props;
      const rolls = JSON.parse(options?.Rolls as string) as number[];
      expect(rolls).toHaveLength(1);
      expect(rolls[0]).toBeGreaterThanOrEqual(1);
      expect(rolls[0]).toBeLessThanOrEqual(6);
    });

    it('should accept ::dice option as an alias', async () => {
      const boxes = await DiceRollBoxSource.generateBoxes('1d6', {
        dice: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Notation).toBe('1d6');
    });

    it('should return an error box for invalid notation "abc"', async () => {
      const boxes = await DiceRollBoxSource.generateBoxes('abc', {
        roll: true,
      });
      expect(boxes).toHaveLength(1);

      const { options } = boxes[0].props;
      // no Notation/Rolls — only an Info key explaining the required format
      expect(options?.Notation).toBeUndefined();
      expect(options?.Info).toBeTruthy();
      const info = options?.Info as string;
      expect(info.toLowerCase()).toContain('notation');
    });

    it('should roll 10d10 and all results should be within [1, 10]', async () => {
      const boxes = await DiceRollBoxSource.generateBoxes('10d10', {
        roll: true,
      });
      expect(boxes).toHaveLength(1);

      const { options } = boxes[0].props;
      const rolls = JSON.parse(options?.Rolls as string) as number[];
      expect(rolls).toHaveLength(10);
      for (const r of rolls) {
        expect(r).toBeGreaterThanOrEqual(1);
        expect(r).toBeLessThanOrEqual(10);
      }

      const total = Number(options?.Total);
      expect(total).toBeGreaterThanOrEqual(10);
      expect(total).toBeLessThanOrEqual(100);
    });

    it('should include k: v plaintext lines in plaintextOutput for headless TUI', async () => {
      const boxes = await DiceRollBoxSource.generateBoxes('1d6', {
        roll: true,
      });
      expect(boxes).toHaveLength(1);

      const { plaintextOutput } = boxes[0].props;
      expect(plaintextOutput).toContain('Notation: 1d6');
      expect(plaintextOutput).toContain('Rolls:');
      expect(plaintextOutput).toContain('Sum:');
      expect(plaintextOutput).toContain('Modifier:');
      expect(plaintextOutput).toContain('Total:');
    });

    it('should set priority from source priority', async () => {
      const boxes = await DiceRollBoxSource.generateBoxes('1d6', {
        roll: true,
      });
      expect(boxes[0].props.priority).toBe(DiceRollBoxSource.priority);
    });

    it('should handle negative modifier (1d6-2) and apply it to total', async () => {
      const boxes = await DiceRollBoxSource.generateBoxes('1d6-2', {
        roll: true,
      });
      expect(boxes).toHaveLength(1);

      const { options } = boxes[0].props;
      expect(options?.Modifier).toBe('-2');

      const total = Number(options?.Total);
      // 1d6-2 range: [1-2, 6-2] = [-1, 4]
      expect(total).toBeGreaterThanOrEqual(-1);
      expect(total).toBeLessThanOrEqual(4);
    });
  });
});
