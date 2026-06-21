import { describe, expect, it } from 'vitest';

import { SoundexBoxSource } from '../SoundexBoxSource';

describe('SoundexBoxSource', () => {
  describe('generateBoxes - option guard', () => {
    it('returns empty array when no soundex option is provided', async () => {
      const boxes = await SoundexBoxSource.generateBoxes('Robert', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await SoundexBoxSource.generateBoxes('Robert', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty input with soundex option', async () => {
      const boxes = await SoundexBoxSource.generateBoxes('', { soundex: true });
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for whitespace-only input', async () => {
      const boxes = await SoundexBoxSource.generateBoxes('   ', {
        soundex: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - single word canonical vectors', () => {
    const cases: [string, string][] = [
      ['Robert', 'R163'],
      ['Rupert', 'R163'],
      ['Rubin', 'R150'],
      ['Ashcraft', 'A261'],
      ['Tymczak', 'T522'],
      ['Pfister', 'P236'],
      ['Honeyman', 'H555'],
    ];

    for (const [word, expected] of cases) {
      it(`${word} → ${expected}`, async () => {
        const boxes = await SoundexBoxSource.generateBoxes(word, {
          soundex: true,
        });
        expect(boxes).toHaveLength(1);
        expect(boxes[0].props.plaintextOutput).toContain(expected);
      });
    }
  });

  describe('generateBoxes - multi-word input', () => {
    it('formats each word on its own line', async () => {
      const boxes = await SoundexBoxSource.generateBoxes('Robert Rupert', {
        soundex: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe(
        'Robert → R163\nRupert → R163',
      );
    });
  });

  describe('generateBoxes - non-letter tokens are skipped', () => {
    it('skips tokens that do not start with a letter', async () => {
      const boxes = await SoundexBoxSource.generateBoxes('123 Robert', {
        soundex: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('Robert → R163');
    });

    it('returns empty array when all tokens are non-letter', async () => {
      const boxes = await SoundexBoxSource.generateBoxes('123 456', {
        soundex: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('box props', () => {
    it('box name is Soundex', async () => {
      const boxes = await SoundexBoxSource.generateBoxes('Robert', {
        soundex: true,
      });
      expect(boxes[0].props.name).toBe('Soundex');
    });

    it('showExpandButton is false', async () => {
      const boxes = await SoundexBoxSource.generateBoxes('Robert', {
        soundex: true,
      });
      expect(boxes[0].props.showExpandButton).toBe(false);
    });

    it('priority is set', async () => {
      const boxes = await SoundexBoxSource.generateBoxes('Robert', {
        soundex: true,
      });
      expect(typeof boxes[0].props.priority).toBe('number');
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(SoundexBoxSource.name).toBe('Soundex');
      expect(typeof SoundexBoxSource.priority).toBe('number');
    });
  });
});
