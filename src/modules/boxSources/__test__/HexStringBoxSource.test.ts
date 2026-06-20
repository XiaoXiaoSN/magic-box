import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { HexStringBoxSource } from '../HexStringBoxSource';

describe('HexStringBoxSource', () => {
  describe('no option', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await HexStringBoxSource.generateBoxes('hi', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await HexStringBoxSource.generateBoxes('hi', {});
      expect(boxes).toHaveLength(0);
    });
  });

  describe('encode — ::hex / ::hexencode', () => {
    it('encodes "hi" to "6869"', async () => {
      const boxes = await HexStringBoxSource.generateBoxes('hi', { hex: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Hex (Encode)');
      expect(boxes[0].props.plaintextOutput).toBe('6869');
      expect(boxes[0].boxTemplate).toBe(DefaultBoxTemplate);
      expect(boxes[0].props.showExpandButton).toBe(false);
    });

    it('encodes "A" to "41"', async () => {
      const boxes = await HexStringBoxSource.generateBoxes('A', { hex: true });
      expect(boxes[0].props.plaintextOutput).toBe('41');
    });

    it('encodes "€" (U+20AC, UTF-8 e2 82 ac) to "e282ac"', async () => {
      const boxes = await HexStringBoxSource.generateBoxes('€', { hex: true });
      expect(boxes[0].props.plaintextOutput).toBe('e282ac');
    });

    it('also triggers on ::hexencode', async () => {
      const boxes = await HexStringBoxSource.generateBoxes('hi', {
        hexencode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('6869');
    });
  });

  describe('decode — ::hexdecode', () => {
    it('decodes "6869" to "hi"', async () => {
      const boxes = await HexStringBoxSource.generateBoxes('6869', {
        hexdecode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Hex (Decode)');
      expect(boxes[0].props.plaintextOutput).toBe('hi');
      expect(boxes[0].props.showExpandButton).toBe(false);
    });

    it('decodes "0x4869" (leading 0x) to "Hi"', async () => {
      const boxes = await HexStringBoxSource.generateBoxes('0x4869', {
        hexdecode: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('Hi');
    });

    it('decodes "68 69" (with spaces) to "hi"', async () => {
      const boxes = await HexStringBoxSource.generateBoxes('68 69', {
        hexdecode: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('hi');
    });
  });

  describe('decode — invalid input', () => {
    it('returns an invalid box for odd-length "123"', async () => {
      const boxes = await HexStringBoxSource.generateBoxes('123', {
        hexdecode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/invalid/i);
    });

    it('returns an invalid box for non-hex "zz"', async () => {
      const boxes = await HexStringBoxSource.generateBoxes('zz', {
        hexdecode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/invalid/i);
    });
  });

  describe('both ::hex and ::hexdecode together', () => {
    it('returns 2 boxes — one encode and one decode', async () => {
      const boxes = await HexStringBoxSource.generateBoxes('hi', {
        hex: true,
        hexdecode: true,
      });
      expect(boxes).toHaveLength(2);
      const names = boxes.map((b) => b.props.name);
      expect(names).toContain('Hex (Encode)');
      expect(names).toContain('Hex (Decode)');
    });
  });
});
