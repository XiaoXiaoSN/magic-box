import { describe, expect, it } from 'vitest';

import { NumberToWordsBoxSource } from '../NumberToWordsBoxSource';

describe('NumberToWordsBoxSource', () => {
  describe('generateBoxes — option guard', () => {
    it('returns [] when ::numwords option is absent', async () => {
      const boxes = await NumberToWordsBoxSource.generateBoxes('1234', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when options is an empty object', async () => {
      const boxes = await NumberToWordsBoxSource.generateBoxes('1234', {});
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes — valid integers', () => {
    async function words(input: string): Promise<string> {
      const boxes = await NumberToWordsBoxSource.generateBoxes(input, {
        numwords: true,
      });
      expect(boxes).toHaveLength(1);
      return boxes[0].props.plaintextOutput;
    }

    it('converts 0 to "zero"', async () => {
      expect(await words('0')).toBe('zero');
    });

    it('converts 21 to "twenty-one"', async () => {
      expect(await words('21')).toBe('twenty-one');
    });

    it('converts 100 to "one hundred"', async () => {
      expect(await words('100')).toBe('one hundred');
    });

    it('converts 1234 to "one thousand two hundred thirty-four"', async () => {
      expect(await words('1234')).toBe('one thousand two hundred thirty-four');
    });

    it('converts 1000000 to "one million"', async () => {
      expect(await words('1000000')).toBe('one million');
    });

    it('converts -42 to "negative forty-two"', async () => {
      expect(await words('-42')).toBe('negative forty-two');
    });
  });

  describe('generateBoxes — invalid input', () => {
    it('returns [] for non-numeric input "abc"', async () => {
      const boxes = await NumberToWordsBoxSource.generateBoxes('abc', {
        numwords: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for decimal "1.5"', async () => {
      const boxes = await NumberToWordsBoxSource.generateBoxes('1.5', {
        numwords: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty string', async () => {
      const boxes = await NumberToWordsBoxSource.generateBoxes('', {
        numwords: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes — box metadata', () => {
    it('sets name, showExpandButton false, and correct priority', async () => {
      const boxes = await NumberToWordsBoxSource.generateBoxes('5', {
        numwords: true,
      });
      expect(boxes).toHaveLength(1);
      const { props, boxTemplate } = boxes[0];
      expect(props.name).toBe('Number to Words');
      expect(props.priority).toBe(10);
      expect(props.showExpandButton).toBe(false);
      expect(boxTemplate).toBeUndefined();
    });
  });
});
