import { describe, expect, it } from 'vitest';

import { NatoPhoneticBoxSource } from '../NatoPhoneticBoxSource';

describe('NatoPhoneticBoxSource', () => {
  describe('generateBoxes', () => {
    it('should return empty array when no option is provided', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes('AB12', null);
      expect(boxes).toHaveLength(0);
    });

    it('should return empty array for empty input even with option', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes('', {
        nato: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('should return empty array for whitespace-only input', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes('   ', {
        nato: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('should spell "AB12" correctly with ::nato option', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes('AB12', {
        nato: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('Alfa Bravo One Two');
    });

    it('should also trigger with ::phonetic option', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes('AB12', {
        phonetic: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('Alfa Bravo One Two');
    });

    it('should handle lowercase input case-insensitively', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes('sos', {
        nato: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('Sierra Oscar Sierra');
    });

    it('should use official spellings: Alfa, Juliett, X-ray', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes('AJX', {
        nato: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('Alfa Juliett X-ray');
    });

    it('should render spaces as "(space)"', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes('A B', {
        nato: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('Alfa (space) Bravo');
    });

    it('should pass through unrecognised punctuation literally', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes('A!', {
        nato: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('Alfa !');
    });

    it('should set box name to "NATO Phonetic"', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes('A', {
        nato: true,
      });
      expect(boxes[0].props.name).toBe('NATO Phonetic');
    });

    it('should set priority to 10', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes('A', {
        nato: true,
      });
      expect(boxes[0].props.priority).toBe(10);
    });

    it('should disable expand button', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes('A', {
        nato: true,
      });
      expect(boxes[0].props.showExpandButton).toBe(false);
    });
  });
});
