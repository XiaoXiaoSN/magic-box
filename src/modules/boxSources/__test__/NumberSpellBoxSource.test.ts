import { describe, expect, it } from 'vitest';

import { NumberSpellBoxSource } from '../NumberSpellBoxSource';

describe('NumberSpellBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns empty array when no trigger option is present', async () => {
      const boxes = await NumberSpellBoxSource.generateBoxes('42', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for non-integer input', async () => {
      const boxes = await NumberSpellBoxSource.generateBoxes('abc', {
        spell: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for decimal input', async () => {
      const boxes = await NumberSpellBoxSource.generateBoxes('1.5', {
        spell: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('spells zero', async () => {
      const boxes = await NumberSpellBoxSource.generateBoxes('0', {
        spell: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('zero');
    });

    it('spells single digit seven', async () => {
      const boxes = await NumberSpellBoxSource.generateBoxes('7', {
        spell: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('seven');
    });

    it('hyphenates compound tens: 42', async () => {
      const boxes = await NumberSpellBoxSource.generateBoxes('42', {
        spell: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('forty-two');
    });

    it('spells round hundred: 100', async () => {
      const boxes = await NumberSpellBoxSource.generateBoxes('100', {
        spell: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('one hundred');
    });

    it('spells hundred-and-one (American style, no "and"): 101', async () => {
      const boxes = await NumberSpellBoxSource.generateBoxes('101', {
        spell: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('one hundred one');
    });

    it('spells 1234567 exactly', async () => {
      const boxes = await NumberSpellBoxSource.generateBoxes('1234567', {
        spell: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe(
        'one million two hundred thirty-four thousand five hundred sixty-seven',
      );
    });

    it('spells negative numbers', async () => {
      const boxes = await NumberSpellBoxSource.generateBoxes('-5', {
        spell: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('negative five');
    });

    it('spells one billion', async () => {
      const boxes = await NumberSpellBoxSource.generateBoxes('1000000000', {
        spell: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('one billion');
    });

    it('also triggers on ::numwords option key', async () => {
      const boxes = await NumberSpellBoxSource.generateBoxes('42', {
        numwords: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('forty-two');
    });

    it('sets correct box name and priority', async () => {
      const boxes = await NumberSpellBoxSource.generateBoxes('7', {
        spell: true,
      });
      expect(boxes[0].props.name).toBe('Number to Words');
      expect(boxes[0].props.priority).toBe(10);
    });
  });
});
