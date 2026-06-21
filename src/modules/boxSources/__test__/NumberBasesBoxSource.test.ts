import { describe, expect, it } from 'vitest';
import { NumberBasesBoxSource } from '../NumberBasesBoxSource';

describe('NumberBasesBoxSource', () => {
  describe('generateBoxes — option gate', () => {
    it('returns [] when no matching option key is provided', async () => {
      const boxes = await NumberBasesBoxSource.generateBoxes('255', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when unrelated option key is provided', async () => {
      const boxes = await NumberBasesBoxSource.generateBoxes('255', {
        qrcode: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes — decimal input', () => {
    it('converts 255 to all four bases', async () => {
      const boxes = await NumberBasesBoxSource.generateBoxes('255', {
        bases: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Decimal).toBe('255');
      expect(opts.Hex).toBe('0xff');
      expect(opts.Octal).toBe('0o377');
      expect(opts.Binary).toBe('0b11111111');
    });

    it('converts 0 correctly', async () => {
      const boxes = await NumberBasesBoxSource.generateBoxes('0', {
        bases: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Decimal).toBe('0');
      expect(opts.Hex).toBe('0x0');
      expect(opts.Octal).toBe('0o0');
      expect(opts.Binary).toBe('0b0');
    });
  });

  describe('generateBoxes — prefixed input', () => {
    it('parses hex input 0xff', async () => {
      const boxes = await NumberBasesBoxSource.generateBoxes('0xff', {
        bases: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Decimal).toBe('255');
      expect(opts.Hex).toBe('0xff');
    });

    it('parses binary input 0b1010', async () => {
      const boxes = await NumberBasesBoxSource.generateBoxes('0b1010', {
        bases: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Decimal).toBe('10');
      expect(opts.Hex).toBe('0xa');
    });

    it('parses octal input 0o17', async () => {
      const boxes = await NumberBasesBoxSource.generateBoxes('0o17', {
        bases: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Decimal).toBe('15');
    });

    it('accepts uppercase prefixes 0X, 0O, 0B', async () => {
      const hexBoxes = await NumberBasesBoxSource.generateBoxes('0XFF', {
        bases: true,
      });
      expect(
        (hexBoxes[0].props.options as Record<string, string>).Decimal,
      ).toBe('255');

      const octBoxes = await NumberBasesBoxSource.generateBoxes('0O17', {
        bases: true,
      });
      expect(
        (octBoxes[0].props.options as Record<string, string>).Decimal,
      ).toBe('15');

      const binBoxes = await NumberBasesBoxSource.generateBoxes('0B1010', {
        bases: true,
      });
      expect(
        (binBoxes[0].props.options as Record<string, string>).Decimal,
      ).toBe('10');
    });
  });

  describe('generateBoxes — negative numbers', () => {
    it('handles negative decimal -16', async () => {
      const boxes = await NumberBasesBoxSource.generateBoxes('-16', {
        bases: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Decimal).toBe('-16');
      expect(opts.Hex).toBe('-0x10');
      expect(opts.Octal).toBe('-0o20');
      expect(opts.Binary).toBe('-0b10000');
    });
  });

  describe('generateBoxes — BigInt precision beyond Number', () => {
    it('handles 9007199254740993 (> 2^53) with exact precision', async () => {
      const boxes = await NumberBasesBoxSource.generateBoxes(
        '9007199254740993',
        { bases: true },
      );
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Decimal).toBe('9007199254740993');
      expect(opts.Hex).toBe('0x20000000000001');
    });
  });

  describe('generateBoxes — invalid input', () => {
    it('returns [] for "xyz"', async () => {
      const boxes = await NumberBasesBoxSource.generateBoxes('xyz', {
        bases: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for bare prefix "0x" with no digits', async () => {
      const boxes = await NumberBasesBoxSource.generateBoxes('0x', {
        bases: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for floating point "12.5"', async () => {
      const boxes = await NumberBasesBoxSource.generateBoxes('12.5', {
        bases: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty string', async () => {
      const boxes = await NumberBasesBoxSource.generateBoxes('', {
        bases: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('accepts ::numbase option key as well', async () => {
      const boxes = await NumberBasesBoxSource.generateBoxes('10', {
        numbase: true,
      });
      expect(boxes).toHaveLength(1);
    });
  });

  describe('generateBoxes — box metadata', () => {
    it('sets box name to "Number Bases"', async () => {
      const boxes = await NumberBasesBoxSource.generateBoxes('255', {
        bases: true,
      });
      expect(boxes[0].props.name).toBe('Number Bases');
    });

    it('sets priority to 10', async () => {
      const boxes = await NumberBasesBoxSource.generateBoxes('255', {
        bases: true,
      });
      expect(boxes[0].props.priority).toBe(10);
    });
  });
});
