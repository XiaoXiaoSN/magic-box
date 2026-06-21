import { describe, expect, it } from 'vitest';

import { Base91BoxSource } from '../Base91BoxSource';

// basE91 alphabet used by the encoder — used to validate output chars
const ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,./:;<=>?@[]^_`{|}~"';
const ALPHABET_SET = new Set(ALPHABET);

describe('Base91BoxSource', () => {
  describe('generateBoxes — no match', () => {
    it('should return [] when no option keys are given', async () => {
      const boxes = await Base91BoxSource.generateBoxes('hello', null);
      expect(boxes).toHaveLength(0);
    });

    it('should return [] for empty input with ::base91', async () => {
      const boxes = await Base91BoxSource.generateBoxes('', { base91: true });
      expect(boxes).toHaveLength(0);
    });

    it('should return [] for whitespace-only input', async () => {
      const boxes = await Base91BoxSource.generateBoxes('   ', {
        base91: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('encode (::base91 / ::base91encode)', () => {
    it('should produce a non-empty string of valid alphabet chars for "hello"', async () => {
      const boxes = await Base91BoxSource.generateBoxes('hello', {
        base91: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('basE91 (Encode)');
      expect(boxes[0].props.priority).toBe(10);

      const out = boxes[0].props.plaintextOutput;
      expect(out.length).toBeGreaterThan(0);
      for (const ch of out) {
        expect(ALPHABET_SET.has(ch)).toBe(true);
      }
    });

    it('should produce valid alphabet chars using ::base91encode alias', async () => {
      const boxes = await Base91BoxSource.generateBoxes('hello', {
        base91encode: true,
      });
      expect(boxes).toHaveLength(1);
      const out = boxes[0].props.plaintextOutput;
      expect(out.length).toBeGreaterThan(0);
      for (const ch of out) {
        expect(ALPHABET_SET.has(ch)).toBe(true);
      }
    });
  });

  describe('decode (::base91decode)', () => {
    it('should decode an encoded value back to original', async () => {
      const encBoxes = await Base91BoxSource.generateBoxes('hello', {
        base91: true,
      });
      const encoded = encBoxes[0].props.plaintextOutput;

      const decBoxes = await Base91BoxSource.generateBoxes(encoded, {
        base91decode: true,
      });
      expect(decBoxes).toHaveLength(1);
      expect(decBoxes[0].props.name).toBe('basE91 (Decode)');
      expect(decBoxes[0].props.plaintextOutput).toBe('hello');
    });
  });

  describe('round-trip — ASCII', () => {
    it('should round-trip "hello world"', async () => {
      const input = 'hello world';
      const enc = await Base91BoxSource.generateBoxes(input, { base91: true });
      const encoded = enc[0].props.plaintextOutput;
      const dec = await Base91BoxSource.generateBoxes(encoded, {
        base91decode: true,
      });
      expect(dec[0].props.plaintextOutput).toBe(input);
    });

    it('should round-trip the quick brown fox sentence', async () => {
      const input = 'The quick brown fox jumps over the lazy dog';
      const enc = await Base91BoxSource.generateBoxes(input, { base91: true });
      const encoded = enc[0].props.plaintextOutput;
      const dec = await Base91BoxSource.generateBoxes(encoded, {
        base91decode: true,
      });
      expect(dec[0].props.plaintextOutput).toBe(input);
    });
  });

  describe('round-trip — unicode', () => {
    it('should round-trip "café 日本 😀"', async () => {
      const input = 'café 日本 😀';
      const enc = await Base91BoxSource.generateBoxes(input, { base91: true });
      expect(enc).toHaveLength(1);
      const encoded = enc[0].props.plaintextOutput;

      // all output chars must be in the basE91 alphabet
      for (const ch of encoded) {
        expect(ALPHABET_SET.has(ch)).toBe(true);
      }

      const dec = await Base91BoxSource.generateBoxes(encoded, {
        base91decode: true,
      });
      expect(dec[0].props.plaintextOutput).toBe(input);
    });
  });

  describe('both options', () => {
    it('should return 2 boxes when both ::base91 and ::base91decode are set', async () => {
      // encode "hello" first to get a valid basE91 string, then use it as input
      const encFirst = await Base91BoxSource.generateBoxes('hello', {
        base91: true,
      });
      const validEncoded = encFirst[0].props.plaintextOutput;

      const boxes = await Base91BoxSource.generateBoxes(validEncoded, {
        base91: true,
        base91decode: true,
      });
      expect(boxes).toHaveLength(2);
      expect(boxes[0].props.name).toBe('basE91 (Encode)');
      expect(boxes[1].props.name).toBe('basE91 (Decode)');
    });
  });
});
