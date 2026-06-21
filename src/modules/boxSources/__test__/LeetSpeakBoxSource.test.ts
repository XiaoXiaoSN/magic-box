import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { LeetSpeakBoxSource } from '../LeetSpeakBoxSource';

describe('LeetSpeakBoxSource', () => {
  describe('gate conditions', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('leet', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when options object has no leet key', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('leet', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input with ::leet', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('', { leet: true });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for whitespace-only input with ::leet', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('   ', {
        leet: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input with ::leetdecode', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('', {
        leetdecode: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('encode correctness', () => {
    it('encodes "leet" to "1337"', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('leet', {
        leet: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('1337');
    });

    it('encodes "hello" to "h3110"', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('hello', {
        leet: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('h3110');
    });

    it('encodes "goat" to "9047"', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('goat', {
        leet: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('9047');
    });

    it('preserves non-mapped characters: "a b!" → "4 8!"', async () => {
      // a→4, space preserved, b→8, !→!
      const boxes = await LeetSpeakBoxSource.generateBoxes('a b!', {
        leet: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('4 8!');
    });

    it('lowercases input before encoding: "LEET" → "1337"', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('LEET', {
        leet: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('1337');
    });

    it('accepts ::leetencode as an alias for ::leet', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('leet', {
        leetencode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('1337');
    });
  });

  describe('decode correctness', () => {
    it('decodes "1337" to "leet"', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('1337', {
        leetdecode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('leet');
    });

    it('decodes "h3110" to "hello"', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('h3110', {
        leetdecode: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('hello');
    });

    it('accepts ::unleet as an alias for ::leetdecode', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('1337', {
        unleet: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('leet');
    });

    it('preserves unmapped chars during decode: "h3110!" → "hello!"', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('h3110!', {
        leetdecode: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('hello!');
    });
  });

  describe('round-trip', () => {
    it('encode then decode round-trips "leet" back to "leet"', async () => {
      const encoded = await LeetSpeakBoxSource.generateBoxes('leet', {
        leet: true,
      });
      const decoded = await LeetSpeakBoxSource.generateBoxes(
        encoded[0].props.plaintextOutput,
        { leetdecode: true },
      );
      expect(decoded[0].props.plaintextOutput).toBe('leet');
    });

    it('encode then decode round-trips "goat" back to "goat"', async () => {
      const encoded = await LeetSpeakBoxSource.generateBoxes('goat', {
        leet: true,
      });
      const decoded = await LeetSpeakBoxSource.generateBoxes(
        encoded[0].props.plaintextOutput,
        { leetdecode: true },
      );
      expect(decoded[0].props.plaintextOutput).toBe('goat');
    });
  });

  describe('both options produce two boxes', () => {
    it('returns 2 boxes when both ::leet and ::leetdecode are set', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('leet', {
        leet: true,
        leetdecode: true,
      });
      expect(boxes).toHaveLength(2);
    });

    it('first box is encode, second is decode', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('leet', {
        leet: true,
        leetdecode: true,
      });
      expect(boxes[0].props.name).toBe('Leetspeak (Encode)');
      expect(boxes[1].props.name).toBe('Leetspeak (Decode)');
    });
  });

  describe('box properties', () => {
    it('encode box name is "Leetspeak (Encode)"', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('leet', {
        leet: true,
      });
      expect(boxes[0].props.name).toBe('Leetspeak (Encode)');
    });

    it('decode box name is "Leetspeak (Decode)"', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('1337', {
        leetdecode: true,
      });
      expect(boxes[0].props.name).toBe('Leetspeak (Decode)');
    });

    it('uses DefaultBoxTemplate', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('leet', {
        leet: true,
      });
      expect(boxes[0].boxTemplate).toBe(DefaultBoxTemplate);
    });

    it('sets showExpandButton to false', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('leet', {
        leet: true,
      });
      expect(boxes[0].props.showExpandButton).toBe(false);
    });

    it('sets priority from source priority', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('leet', {
        leet: true,
      });
      expect(boxes[0].props.priority).toBe(LeetSpeakBoxSource.priority);
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(LeetSpeakBoxSource.name).toBe('Leetspeak');
      expect(LeetSpeakBoxSource.kind).toBe('Transform');
      expect(typeof LeetSpeakBoxSource.priority).toBe('number');
    });
  });
});
