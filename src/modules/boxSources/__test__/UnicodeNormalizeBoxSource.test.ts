import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { UnicodeNormalizeBoxSource } from '../UnicodeNormalizeBoxSource';

describe('UnicodeNormalizeBoxSource', () => {
  describe('gate conditions', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await UnicodeNormalizeBoxSource.generateBoxes('café', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await UnicodeNormalizeBoxSource.generateBoxes('café', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty input string', async () => {
      const boxes = await UnicodeNormalizeBoxSource.generateBoxes('', {
        normalize: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array when input exceeds MAX_INPUT', async () => {
      const boxes = await UnicodeNormalizeBoxSource.generateBoxes(
        'a'.repeat(100_001),
        { normalize: true },
      );
      expect(boxes).toHaveLength(0);
    });
  });

  describe('trigger keys', () => {
    it('activates on ::normalize key', async () => {
      const boxes = await UnicodeNormalizeBoxSource.generateBoxes('abc', {
        normalize: true,
      });
      expect(boxes).toHaveLength(1);
    });

    it('activates on ::unicodenormalize key', async () => {
      const boxes = await UnicodeNormalizeBoxSource.generateBoxes('abc', {
        unicodenormalize: true,
      });
      expect(boxes).toHaveLength(1);
    });
  });

  describe('precomposed é (U+00E9)', () => {
    // 'é' as a single precomposed code point (U+00E9, length 1)
    const precomposed = 'é';

    it('NFC keeps length 1 (precomposed)', async () => {
      const boxes = await UnicodeNormalizeBoxSource.generateBoxes(precomposed, {
        normalize: true,
      });
      expect(boxes[0].props.options?.NFC).toHaveLength(1);
    });

    it('NFD decomposes to length 2 (base e + combining accent)', async () => {
      const boxes = await UnicodeNormalizeBoxSource.generateBoxes(precomposed, {
        normalize: true,
      });
      expect(boxes[0].props.options?.NFD).toHaveLength(2);
    });
  });

  describe('ligature ﬁ (U+FB01)', () => {
    // 'ﬁ' is a single ligature code point that NFKC/NFKD decompose to 'fi'
    const ligature = 'ﬁ';

    it('NFKC decomposes ﬁ to "fi"', async () => {
      const boxes = await UnicodeNormalizeBoxSource.generateBoxes(ligature, {
        normalize: true,
      });
      expect(boxes[0].props.options?.NFKC).toBe('fi');
    });

    it('NFKD decomposes ﬁ to "fi"', async () => {
      const boxes = await UnicodeNormalizeBoxSource.generateBoxes(ligature, {
        normalize: true,
      });
      expect(boxes[0].props.options?.NFKD).toBe('fi');
    });

    it('NFC keeps ﬁ unchanged', async () => {
      const boxes = await UnicodeNormalizeBoxSource.generateBoxes(ligature, {
        normalize: true,
      });
      expect(boxes[0].props.options?.NFC).toBe(ligature);
    });
  });

  describe('plain ASCII input', () => {
    it('all four forms are equal for plain ASCII', async () => {
      const boxes = await UnicodeNormalizeBoxSource.generateBoxes('abc', {
        normalize: true,
      });
      const opts = boxes[0].props.options;
      expect(opts?.NFC).toBe('abc');
      expect(opts?.NFD).toBe('abc');
      expect(opts?.NFKC).toBe('abc');
      expect(opts?.NFKD).toBe('abc');
    });
  });

  describe('box structure', () => {
    it('returns exactly one box with KeyValueBoxTemplate', async () => {
      const boxes = await UnicodeNormalizeBoxSource.generateBoxes('café', {
        normalize: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('box name is "Unicode Normalize"', async () => {
      const boxes = await UnicodeNormalizeBoxSource.generateBoxes('café', {
        normalize: true,
      });
      expect(boxes[0].props.name).toBe('Unicode Normalize');
    });

    it('box priority matches source priority', async () => {
      const boxes = await UnicodeNormalizeBoxSource.generateBoxes('café', {
        normalize: true,
      });
      expect(boxes[0].props.priority).toBe(UnicodeNormalizeBoxSource.priority);
    });

    it('options contain all four normalization form keys', async () => {
      const boxes = await UnicodeNormalizeBoxSource.generateBoxes('test', {
        normalize: true,
      });
      const keys = Object.keys(boxes[0].props.options ?? {});
      expect(keys).toContain('NFC');
      expect(keys).toContain('NFD');
      expect(keys).toContain('NFKC');
      expect(keys).toContain('NFKD');
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(UnicodeNormalizeBoxSource.name).toBe('Unicode Normalize');
      expect(UnicodeNormalizeBoxSource.tag).toBe('#');
      expect(UnicodeNormalizeBoxSource.kind).toBe('Transform');
      expect(typeof UnicodeNormalizeBoxSource.priority).toBe('number');
    });
  });
});
