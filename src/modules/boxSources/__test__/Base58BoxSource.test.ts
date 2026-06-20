import { describe, expect, it } from 'vitest';

import { Base58BoxSource } from '../Base58BoxSource';

describe('Base58BoxSource', () => {
  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(Base58BoxSource.name).toBe('Base58');
      expect(Base58BoxSource.tag).toBe('#');
      expect(Base58BoxSource.kind).toBe('Encode');
      expect(typeof Base58BoxSource.priority).toBe('number');
    });
  });

  describe('generateBoxes - no option', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await Base58BoxSource.generateBoxes('Hello World!', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await Base58BoxSource.generateBoxes('Hello World!', {});
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - encode known vector', () => {
    it('encodes "Hello World!" to canonical base58', async () => {
      // canonical vector: base58(ASCII bytes of "Hello World!")
      const boxes = await Base58BoxSource.generateBoxes('Hello World!', {
        base58: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Base58 (Encode)');
      expect(boxes[0].props.plaintextOutput).toBe('2NEpo7TZRRrLZSi2U');
      expect(boxes[0].props.showExpandButton).toBe(false);
    });

    it('accepts ::base58encode option alias', async () => {
      const boxes = await Base58BoxSource.generateBoxes('Hello World!', {
        base58encode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('2NEpo7TZRRrLZSi2U');
    });
  });

  describe('generateBoxes - decode', () => {
    it('decodes "2NEpo7TZRRrLZSi2U" back to "Hello World!"', async () => {
      const boxes = await Base58BoxSource.generateBoxes('2NEpo7TZRRrLZSi2U', {
        base58decode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Base58 (Decode)');
      expect(boxes[0].props.plaintextOutput).toBe('Hello World!');
      expect(boxes[0].props.showExpandButton).toBe(false);
    });

    it('returns invalid box for forbidden chars (0, O, I, l)', async () => {
      const boxes = await Base58BoxSource.generateBoxes('0OIl', {
        base58decode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Base58 (Decode)');
      expect(boxes[0].props.plaintextOutput).toBe('invalid Base58 input');
    });
  });

  describe('generateBoxes - round-trip', () => {
    it('decode(encode("Hello World!")) === "Hello World!"', async () => {
      const encBoxes = await Base58BoxSource.generateBoxes('Hello World!', {
        base58: true,
      });
      const encoded = encBoxes[0].props.plaintextOutput;

      const decBoxes = await Base58BoxSource.generateBoxes(encoded, {
        base58decode: true,
      });
      expect(decBoxes[0].props.plaintextOutput).toBe('Hello World!');
    });

    it('decode(encode("foobar")) === "foobar"', async () => {
      const encBoxes = await Base58BoxSource.generateBoxes('foobar', {
        base58: true,
      });
      const encoded = encBoxes[0].props.plaintextOutput;

      const decBoxes = await Base58BoxSource.generateBoxes(encoded, {
        base58decode: true,
      });
      expect(decBoxes[0].props.plaintextOutput).toBe('foobar');
    });
  });

  describe('generateBoxes - both options', () => {
    it('returns 2 boxes when both encode and decode options are set', async () => {
      const boxes = await Base58BoxSource.generateBoxes('Hello World!', {
        base58: true,
        base58decode: true,
      });
      expect(boxes).toHaveLength(2);
      const names = boxes.map((b) => b.props.name);
      expect(names).toContain('Base58 (Encode)');
      expect(names).toContain('Base58 (Decode)');
    });
  });
});
