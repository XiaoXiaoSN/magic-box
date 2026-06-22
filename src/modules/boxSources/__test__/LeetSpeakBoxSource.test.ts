import { describe, expect, it } from 'vitest';

import { LeetSpeakBoxSource } from '../LeetSpeakBoxSource';

describe('LeetSpeakBoxSource', () => {
  describe('no matching option', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('hello', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty options object', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('hello', {});
      expect(boxes).toHaveLength(0);
    });
  });

  describe('empty input', () => {
    it('returns [] for empty string with ::leet', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('', { leet: true });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for whitespace-only input with ::leet', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('   ', {
        leet: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('encode — ::leet', () => {
    // l→1, e→3, e→3, t→7
    it('encodes "leet" → "1337"', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('leet', {
        leet: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Leetspeak (Encode)');
      expect(boxes[0].props.plaintextOutput).toBe('1337');
    });

    // h passes through, a→4, c passes through, k passes through, e→3, r passes through
    it('encodes "hacker" → "h4ck3r"', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('hacker', {
        leet: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('h4ck3r');
    });

    // e→3, l→1, i→1, t→7, e→3
    it('encodes "elite" → "31173" (both l and i map to 1)', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('elite', {
        leet: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('31173');
    });

    it('preserves non-letter characters: "a b!" → "4 8!"', async () => {
      // a→4, space passes through, b→8, !  passes through
      const boxes = await LeetSpeakBoxSource.generateBoxes('a b!', {
        leet: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('4 8!');
    });

    it('accepts ::leetspeak alias', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('leet', {
        leetspeak: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('1337');
    });

    it('accepts ::1337 alias', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('leet', {
        '1337': true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('1337');
    });

    it('priority is set on the box', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('leet', {
        leet: true,
      });
      expect(boxes[0].props.priority).toBe(LeetSpeakBoxSource.priority);
    });
  });

  describe('decode — ::leetdecode', () => {
    // 1→i (ambiguous; 'i' is the canonical choice), 3→e, 3→e, 7→t
    it('decodes "1337" → "leet"', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('1337', {
        leetdecode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Leetspeak (Decode)');
      // '1' maps to 'l' (l overwrites i in the reverse map) — documented approximation
      expect(boxes[0].props.plaintextOutput).toBe('leet');
    });

    it('decodes "h4ck3r" → "hacker"', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('h4ck3r', {
        leetdecode: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('hacker');
    });

    it('accepts ::unleet alias', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('h4ck3r', {
        unleet: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('hacker');
    });
  });

  describe('both encode and decode options', () => {
    it('returns 2 boxes when both ::leet and ::leetdecode are set', async () => {
      const boxes = await LeetSpeakBoxSource.generateBoxes('leet', {
        leet: true,
        leetdecode: true,
      });
      expect(boxes).toHaveLength(2);
      const names = boxes.map((b) => b.props.name);
      expect(names).toContain('Leetspeak (Encode)');
      expect(names).toContain('Leetspeak (Decode)');
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(LeetSpeakBoxSource.name).toBe('Leetspeak');
      expect(LeetSpeakBoxSource.tag).toBe('#');
      expect(LeetSpeakBoxSource.kind).toBe('Transform');
      expect(typeof LeetSpeakBoxSource.priority).toBe('number');
    });
  });
});
