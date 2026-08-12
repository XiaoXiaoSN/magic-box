import { describe, expect, it } from 'vitest';

import { A1Z26BoxSource } from '../A1Z26BoxSource';

describe('A1Z26BoxSource', () => {
  describe('option gating', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await A1Z26BoxSource.generateBoxes('hello', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await A1Z26BoxSource.generateBoxes('hello', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty input with option set', async () => {
      const boxes = await A1Z26BoxSource.generateBoxes('', { a1z26: true });
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for whitespace-only input', async () => {
      const boxes = await A1Z26BoxSource.generateBoxes('   ', { a1z26: true });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('encode (::a1z26)', () => {
    it('encodes a single word correctly', async () => {
      const boxes = await A1Z26BoxSource.generateBoxes('hello', {
        a1z26: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('A1Z26 (Encode)');
      expect(boxes[0].props.plaintextOutput).toBe('8-5-12-12-15');
    });

    it('encodes two words separated by a space', async () => {
      const boxes = await A1Z26BoxSource.generateBoxes('hi there', {
        a1z26: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('8-9 20-8-5-18-5');
    });

    it('treats uppercase and lowercase identically', async () => {
      const lower = await A1Z26BoxSource.generateBoxes('abc', { a1z26: true });
      const upper = await A1Z26BoxSource.generateBoxes('ABC', { a1z26: true });
      expect(lower[0].props.plaintextOutput).toBe(
        upper[0].props.plaintextOutput,
      );
    });

    it('accepts ::a1z26encode option alias', async () => {
      const boxes = await A1Z26BoxSource.generateBoxes('hello', {
        a1z26encode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('8-5-12-12-15');
    });
  });

  describe('decode (::a1z26decode)', () => {
    it('decodes a single encoded word', async () => {
      const boxes = await A1Z26BoxSource.generateBoxes('8-5-12-12-15', {
        a1z26decode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('A1Z26 (Decode)');
      expect(boxes[0].props.plaintextOutput).toBe('hello');
    });

    it('decodes two space-separated encoded words', async () => {
      const boxes = await A1Z26BoxSource.generateBoxes('8-9 20-8-5-18-5', {
        a1z26decode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('hi there');
    });

    it('replaces out-of-range numbers with "?"', async () => {
      const boxes = await A1Z26BoxSource.generateBoxes('0-27', {
        a1z26decode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('??');
    });
  });

  describe('round-trip', () => {
    it('encodes then decodes back to the original lowercase word', async () => {
      const word = 'world';
      const encoded = await A1Z26BoxSource.generateBoxes(word, { a1z26: true });
      const encodedText = encoded[0].props.plaintextOutput;

      const decoded = await A1Z26BoxSource.generateBoxes(encodedText, {
        a1z26decode: true,
      });
      expect(decoded[0].props.plaintextOutput).toBe(word);
    });
  });

  describe('both options active', () => {
    it('returns two boxes when both encode and decode options are set', async () => {
      const boxes = await A1Z26BoxSource.generateBoxes('hello', {
        a1z26: true,
        a1z26decode: true,
      });
      expect(boxes).toHaveLength(2);
      const names = boxes.map((b) => b.props.name);
      expect(names).toContain('A1Z26 (Encode)');
      expect(names).toContain('A1Z26 (Decode)');
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(A1Z26BoxSource.name).toBe('A1Z26');
      expect(A1Z26BoxSource.tag).toBe('#');
      expect(A1Z26BoxSource.kind).toBe('Encode');
      expect(typeof A1Z26BoxSource.priority).toBe('number');
    });
  });
});
