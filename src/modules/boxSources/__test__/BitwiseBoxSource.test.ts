import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { BitwiseBoxSource } from '../BitwiseBoxSource';

describe('BitwiseBoxSource', () => {
  describe('no option key → empty array', () => {
    it('returns [] when no option provided', async () => {
      const boxes = await BitwiseBoxSource.generateBoxes('12 & 10', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when unrelated option provided', async () => {
      const boxes = await BitwiseBoxSource.generateBoxes('12 & 10', {
        hash: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('explicit op form', () => {
    it('AND: 12 & 10 = 8', async () => {
      const boxes = await BitwiseBoxSource.generateBoxes('12 & 10', {
        bitwise: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Result (dec)']).toBe('8');
    });

    it('OR: 12 | 10 = 14', async () => {
      const boxes = await BitwiseBoxSource.generateBoxes('12 | 10', {
        bitwise: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Result (dec)']).toBe('14');
    });

    it('XOR: 12 ^ 10 = 6', async () => {
      const boxes = await BitwiseBoxSource.generateBoxes('12 ^ 10', {
        bitwise: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Result (dec)']).toBe('6');
    });

    it('left shift: 1 << 8 = 256', async () => {
      const boxes = await BitwiseBoxSource.generateBoxes('1 << 8', {
        bitwise: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Result (dec)']).toBe('256');
    });

    it('right shift: 256 >> 2 = 64', async () => {
      const boxes = await BitwiseBoxSource.generateBoxes('256 >> 2', {
        bitwise: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Result (dec)']).toBe('64');
    });

    it('hex operands: 0xff & 0x0f = 15', async () => {
      const boxes = await BitwiseBoxSource.generateBoxes('0xff & 0x0f', {
        bitwise: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Result (dec)']).toBe('15');
      expect(opts['Result (hex)']).toBe('0xf');
    });

    it('binary operands: 0b1100 ^ 0b1010 = 6', async () => {
      const boxes = await BitwiseBoxSource.generateBoxes('0b1100 ^ 0b1010', {
        bitwise: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Result (dec)']).toBe('6');
    });

    it('64-bit: 0xffffffffffffffff ^ 0x0 = 18446744073709551615 (no 32-bit overflow)', async () => {
      const boxes = await BitwiseBoxSource.generateBoxes(
        '0xffffffffffffffff ^ 0x0',
        { bitwise: true },
      );
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      // verifies BigInt arithmetic — a 32-bit number would overflow to -1
      expect(opts['Result (dec)']).toBe('18446744073709551615');
      expect(opts['Result (hex)']).toBe('0xffffffffffffffff');
    });

    it('shift too large returns error box mentioning cap', async () => {
      const boxes = await BitwiseBoxSource.generateBoxes('1 << 99999', {
        bitwise: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toMatch(/4096/);
    });

    it('accepts ::bitop trigger key', async () => {
      const boxes = await BitwiseBoxSource.generateBoxes('12 & 10', {
        bitop: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Result (dec)']).toBe('8');
    });

    it('expression field reflects input tokens', async () => {
      const boxes = await BitwiseBoxSource.generateBoxes('12 & 10', {
        bitwise: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Expression).toContain('12');
      expect(opts.Expression).toContain('&');
      expect(opts.Expression).toContain('10');
    });
  });

  describe('two-operand form', () => {
    it('12 10 → AND=8, OR=14, XOR=6', async () => {
      const boxes = await BitwiseBoxSource.generateBoxes('12 10', {
        bitwise: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.AND).toContain('8');
      expect(opts.OR).toContain('14');
      expect(opts.XOR).toContain('6');
    });

    it('comma-separated: 12,10 → AND contains 8', async () => {
      const boxes = await BitwiseBoxSource.generateBoxes('12,10', {
        bitwise: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.AND).toContain('8');
    });

    it('includes A and B keys', async () => {
      const boxes = await BitwiseBoxSource.generateBoxes('12 10', {
        bitwise: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.A).toContain('12');
      expect(opts.B).toContain('10');
    });

    it('includes shifts when b is in range', async () => {
      const boxes = await BitwiseBoxSource.generateBoxes('1 8', {
        bitwise: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      // 1 << 8 = 256
      expect(opts['A<<B']).toContain('256');
    });
  });

  describe('invalid input', () => {
    it('non-numeric operands return an error box', async () => {
      const boxes = await BitwiseBoxSource.generateBoxes('a & b', {
        bitwise: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toBeDefined();
    });

    it('priority is set', async () => {
      const boxes = await BitwiseBoxSource.generateBoxes('12 & 10', {
        bitwise: true,
      });
      expect(boxes[0].props.priority).toBe(10);
    });
  });
});
