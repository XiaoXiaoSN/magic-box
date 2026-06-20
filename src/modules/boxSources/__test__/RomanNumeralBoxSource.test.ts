import { RomanNumeralBoxSource } from '@modules/boxSources/RomanNumeralBoxSource';
import { describe, expect, it } from 'vitest';

describe('RomanNumeralBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when ::roman option is absent', async () => {
      const boxes = await RomanNumeralBoxSource.generateBoxes('2024', null);
      expect(boxes).toHaveLength(0);
    });

    it('converts 2024 to MMXXIV', async () => {
      const boxes = await RomanNumeralBoxSource.generateBoxes('2024', {
        roman: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('MMXXIV');
    });

    it('converts 4 to IV', async () => {
      const boxes = await RomanNumeralBoxSource.generateBoxes('4', {
        roman: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('IV');
    });

    it('converts 3999 to MMMCMXCIX', async () => {
      const boxes = await RomanNumeralBoxSource.generateBoxes('3999', {
        roman: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('MMMCMXCIX');
    });

    it('converts lowercase roman mmxxiv to 2024', async () => {
      const boxes = await RomanNumeralBoxSource.generateBoxes('mmxxiv', {
        roman: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('2024');
    });

    it('returns [] for 0 (out of range)', async () => {
      const boxes = await RomanNumeralBoxSource.generateBoxes('0', {
        roman: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for 4000 (out of range)', async () => {
      const boxes = await RomanNumeralBoxSource.generateBoxes('4000', {
        roman: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for IIII (invalid subtractive form)', async () => {
      const boxes = await RomanNumeralBoxSource.generateBoxes('IIII', {
        roman: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for arbitrary non-roman string', async () => {
      const boxes = await RomanNumeralBoxSource.generateBoxes('hello', {
        roman: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('box name is Roman Numeral', async () => {
      const boxes = await RomanNumeralBoxSource.generateBoxes('2024', {
        roman: true,
      });
      expect(boxes[0].props.name).toBe('Roman Numeral');
    });
  });
});
