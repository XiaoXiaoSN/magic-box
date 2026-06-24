import { describe, expect, it } from 'vitest';

import { PigLatinBoxSource } from '../PigLatinBoxSource';

describe('PigLatinBoxSource', () => {
  describe('no option → empty', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await PigLatinBoxSource.generateBoxes('hello', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty options object', async () => {
      const boxes = await PigLatinBoxSource.generateBoxes('hello', {});
      expect(boxes).toHaveLength(0);
    });
  });

  describe('empty input → empty', () => {
    it('returns [] when input is empty string', async () => {
      const boxes = await PigLatinBoxSource.generateBoxes('', {
        piglatin: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when input is whitespace only', async () => {
      const boxes = await PigLatinBoxSource.generateBoxes('   ', {
        piglatin: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('consonant-start words', () => {
    it("converts 'hello' → 'ellohay'", async () => {
      const boxes = await PigLatinBoxSource.generateBoxes('hello', {
        piglatin: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('ellohay');
    });

    it("converts 'world' → 'orldway'", async () => {
      const boxes = await PigLatinBoxSource.generateBoxes('world', {
        piglatin: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('orldway');
    });
  });

  describe('vowel-start words', () => {
    it("converts 'apple' → 'appleway'", async () => {
      const boxes = await PigLatinBoxSource.generateBoxes('apple', {
        piglatin: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('appleway');
    });
  });

  describe('sentence', () => {
    it("converts 'hello world' → 'ellohay orldway'", async () => {
      const boxes = await PigLatinBoxSource.generateBoxes('hello world', {
        piglatin: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('ellohay orldway');
    });
  });

  describe('capitalization', () => {
    it("converts 'Hello' → 'Ellohay'", async () => {
      const boxes = await PigLatinBoxSource.generateBoxes('Hello', {
        piglatin: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('Ellohay');
    });
  });

  describe('punctuation', () => {
    it("keeps trailing punctuation in place: 'hello!' → 'ellohay!'", async () => {
      const boxes = await PigLatinBoxSource.generateBoxes('hello!', {
        piglatin: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('ellohay!');
    });
  });

  describe('y as vowel', () => {
    it("converts 'rhythm' → 'ythmrhay' (y treated as vowel after position 0)", async () => {
      const boxes = await PigLatinBoxSource.generateBoxes('rhythm', {
        piglatin: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('ythmrhay');
    });
  });

  describe('piglatinencode alias', () => {
    it('also triggers on ::piglatinencode option', async () => {
      const boxes = await PigLatinBoxSource.generateBoxes('hello', {
        piglatinencode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('ellohay');
    });
  });

  describe('box metadata', () => {
    it('box has correct name', async () => {
      const boxes = await PigLatinBoxSource.generateBoxes('hello world', {
        piglatin: true,
      });
      expect(boxes[0].props.name).toBe('Pig Latin');
    });
  });

  describe('static properties', () => {
    it('has expected metadata', () => {
      expect(PigLatinBoxSource.name).toBe('Pig Latin');
      expect(PigLatinBoxSource.kind).toBe('Transform');
      expect(typeof PigLatinBoxSource.priority).toBe('number');
    });
  });
});
