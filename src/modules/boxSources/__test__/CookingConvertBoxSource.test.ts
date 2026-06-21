import { describe, expect, it } from 'vitest';

import { CookingConvertBoxSource } from '../CookingConvertBoxSource';

describe('CookingConvertBoxSource', () => {
  describe('no option', () => {
    it('returns empty array when no cooking/volume option is provided', async () => {
      const boxes = await CookingConvertBoxSource.generateBoxes('1 cup', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await CookingConvertBoxSource.generateBoxes('1 cup', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for unrelated option', async () => {
      const boxes = await CookingConvertBoxSource.generateBoxes('1 cup', {
        hash: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('1 cup with ::cooking', () => {
    it('returns one box', async () => {
      const boxes = await CookingConvertBoxSource.generateBoxes('1 cup', {
        cooking: true,
      });
      expect(boxes).toHaveLength(1);
    });

    it('box name is Cooking Convert', async () => {
      const boxes = await CookingConvertBoxSource.generateBoxes('1 cup', {
        cooking: true,
      });
      expect(boxes[0].props.name).toBe('Cooking Convert');
    });

    it('ml starts with 236.58823', async () => {
      const boxes = await CookingConvertBoxSource.generateBoxes('1 cup', {
        cooking: true,
      });
      const ml = boxes[0].props.options?.ml as string;
      expect(ml).toMatch(/^236\.58823/);
    });

    it('tbsp is exactly 16 (1 cup = 16 tbsp)', async () => {
      const boxes = await CookingConvertBoxSource.generateBoxes('1 cup', {
        cooking: true,
      });
      expect(boxes[0].props.options?.tbsp).toBe('16');
    });

    it('tsp is exactly 48 (1 cup = 48 tsp)', async () => {
      const boxes = await CookingConvertBoxSource.generateBoxes('1 cup', {
        cooking: true,
      });
      expect(boxes[0].props.options?.tsp).toBe('48');
    });

    it('fl oz is exactly 8', async () => {
      const boxes = await CookingConvertBoxSource.generateBoxes('1 cup', {
        cooking: true,
      });
      expect(boxes[0].props.options?.['fl oz']).toBe('8');
    });
  });

  describe('3 tsp', () => {
    it('tbsp is exactly 1 (3 tsp = 1 tbsp)', async () => {
      const boxes = await CookingConvertBoxSource.generateBoxes('3 tsp', {
        cooking: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.tbsp).toBe('1');
    });
  });

  describe('1 tbsp', () => {
    it('tsp is exactly 3 (1 tbsp = 3 tsp)', async () => {
      const boxes = await CookingConvertBoxSource.generateBoxes('1 tbsp', {
        cooking: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.tsp).toBe('3');
    });
  });

  describe('1 gallon', () => {
    it('quart is exactly 4', async () => {
      const boxes = await CookingConvertBoxSource.generateBoxes('1 gallon', {
        cooking: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.quart).toBe('4');
    });

    it('pint is exactly 8', async () => {
      const boxes = await CookingConvertBoxSource.generateBoxes('1 gallon', {
        cooking: true,
      });
      expect(boxes[0].props.options?.pint).toBe('8');
    });

    it('cup is exactly 16', async () => {
      const boxes = await CookingConvertBoxSource.generateBoxes('1 gallon', {
        cooking: true,
      });
      expect(boxes[0].props.options?.cup).toBe('16');
    });
  });

  describe('1000 ml', () => {
    it('L is exactly 1', async () => {
      const boxes = await CookingConvertBoxSource.generateBoxes('1000 ml', {
        cooking: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.L).toBe('1');
    });
  });

  describe('fl oz with space: 8 fl oz', () => {
    it('cup is exactly 1 (8 fl oz = 1 cup)', async () => {
      const boxes = await CookingConvertBoxSource.generateBoxes('8 fl oz', {
        cooking: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.cup).toBe('1');
    });
  });

  describe('::volume trigger', () => {
    it('also triggers on ::volume option', async () => {
      const boxes = await CookingConvertBoxSource.generateBoxes('1 cup', {
        volume: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.tbsp).toBe('16');
    });
  });

  describe('invalid input', () => {
    it('returns box mentioning supported units for non-numeric input "abc"', async () => {
      const boxes = await CookingConvertBoxSource.generateBoxes('abc', {
        cooking: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/supported units/i);
    });

    it('returns box mentioning supported units for unknown unit "5 stones"', async () => {
      const boxes = await CookingConvertBoxSource.generateBoxes('5 stones', {
        cooking: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/supported units/i);
    });

    it('returns error box for input exceeding 64 characters', async () => {
      const boxes = await CookingConvertBoxSource.generateBoxes(
        '1 cup with a very long trailing string that exceeds the limit here',
        { cooking: true },
      );
      expect(boxes).toHaveLength(0);
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(CookingConvertBoxSource.name).toBe('Cooking Convert');
      expect(CookingConvertBoxSource.tag).toBe('#');
      expect(CookingConvertBoxSource.kind).toBe('Convert');
      expect(CookingConvertBoxSource.priority).toBe(10);
    });
  });
});
