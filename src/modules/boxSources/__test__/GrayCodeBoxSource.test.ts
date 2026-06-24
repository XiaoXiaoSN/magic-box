import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { GrayCodeBoxSource } from '../GrayCodeBoxSource';

describe('GrayCodeBoxSource', () => {
  describe('generateBoxes', () => {
    it('should return [] when no option key is provided', async () => {
      const boxes = await GrayCodeBoxSource.generateBoxes('5', null);
      expect(boxes).toHaveLength(0);
    });

    it('should return [] when unrelated option key is provided', async () => {
      const boxes = await GrayCodeBoxSource.generateBoxes('5', {
        base64: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('should convert 5 to Gray code 7 (101 → 111)', async () => {
      const boxes = await GrayCodeBoxSource.generateBoxes('5', { gray: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Gray Code');
      expect(boxes[0].props.priority).toBe(10);
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Decimal).toBe('5');
      expect(opts.Binary).toBe('101');
      expect(opts['Gray (binary)']).toBe('111');
      expect(opts['Gray (decimal)']).toBe('7');
    });

    it('should accept ::graycode option key', async () => {
      const boxes = await GrayCodeBoxSource.generateBoxes('5', {
        graycode: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Gray (decimal)']).toBe('7');
    });

    it('should convert 0 → Gray 0', async () => {
      const boxes = await GrayCodeBoxSource.generateBoxes('0', { gray: true });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Decimal).toBe('0');
      expect(opts.Binary).toBe('0');
      expect(opts['Gray (binary)']).toBe('0');
      expect(opts['Gray (decimal)']).toBe('0');
    });

    it('should convert 1 → Gray 1 (1 ^ 0 = 1)', async () => {
      const boxes = await GrayCodeBoxSource.generateBoxes('1', { gray: true });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Decimal).toBe('1');
      expect(opts.Binary).toBe('1');
      expect(opts['Gray (binary)']).toBe('1');
      expect(opts['Gray (decimal)']).toBe('1');
    });

    it('should convert 4 → Gray 6 (100 → 110)', async () => {
      const boxes = await GrayCodeBoxSource.generateBoxes('4', { gray: true });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Decimal).toBe('4');
      expect(opts.Binary).toBe('100');
      expect(opts['Gray (binary)']).toBe('110');
      expect(opts['Gray (decimal)']).toBe('6');
    });

    it('should convert 255 → Gray 128 (11111111 ^ 01111111 = 10000000)', async () => {
      const boxes = await GrayCodeBoxSource.generateBoxes('255', {
        gray: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Decimal).toBe('255');
      expect(opts.Binary).toBe('11111111');
      expect(opts['Gray (binary)']).toBe('10000000');
      expect(opts['Gray (decimal)']).toBe('128');
    });

    it('should handle 2^32 (4294967296) without overflow using BigInt', async () => {
      // 4294967296 = 0x1_0000_0000; gray = n ^ (n >> 1) = 0x1_0000_0000 ^ 0x8000_0000 = 0x1_8000_0000 = 6442450944
      const boxes = await GrayCodeBoxSource.generateBoxes('4294967296', {
        gray: true,
      });
      expect(boxes).toHaveLength(1);
      expect(() => boxes[0].props.options).not.toThrow();
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Decimal).toBe('4294967296');
      expect(opts['Gray (decimal)']).toBe('6442450944');
      // binary of 4294967296 = 100000000000000000000000000000000 (33 bits)
      expect(opts.Binary).toBe('100000000000000000000000000000000');
      expect(opts['Gray (binary)']).toBe('110000000000000000000000000000000');
    });

    it('should return an error box for invalid input "abc"', async () => {
      const boxes = await GrayCodeBoxSource.generateBoxes('abc', {
        gray: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Gray Code');
      // plaintext must mention non-negative integer
      expect(boxes[0].props.plaintextOutput).toMatch(/non-negative integer/);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toMatch(/non-negative integer/);
    });

    it('should return an error box for negative input "-1"', async () => {
      const boxes = await GrayCodeBoxSource.generateBoxes('-1', { gray: true });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toMatch(/non-negative integer/);
    });

    it('should return an error box for float input "3.14"', async () => {
      const boxes = await GrayCodeBoxSource.generateBoxes('3.14', {
        gray: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toMatch(/non-negative integer/);
    });

    it('plaintextOutput should be non-empty k:v lines for valid input', async () => {
      const boxes = await GrayCodeBoxSource.generateBoxes('5', { gray: true });
      const pt = boxes[0].props.plaintextOutput;
      expect(pt).toContain('Decimal: 5');
      expect(pt).toContain('Binary: 101');
      expect(pt).toContain('Gray (binary): 111');
      expect(pt).toContain('Gray (decimal): 7');
    });
  });
});
