import { describe, expect, it } from 'vitest';

import { TwosComplementBoxSource } from '../TwosComplementBoxSource';

describe('TwosComplementBoxSource', () => {
  describe('no option', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('-42', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('-42', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for unrelated option', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('-42', {
        ieee754: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe("-42 @ 8-bit — known two's complement vector", () => {
    it('produces correct Binary, Hex, Unsigned for -42 with ::twoscomplement=8', async () => {
      // -42 in 8-bit two's complement: (-42) & 0xFF = 214 = 0b11010110 = 0xd6
      const boxes = await TwosComplementBoxSource.generateBoxes('-42', {
        twoscomplement: '8',
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Binary).toBe('11010110');
      expect(opts.Hex).toBe('0xd6');
      expect(opts.Unsigned).toBe('214');
      expect(opts['Bit Width']).toBe('8');
      expect(opts.Value).toBe('-42');
    });
  });

  describe('42 @ 8-bit with ::twos alias', () => {
    it('produces correct Binary and Unsigned for positive 42', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('42', {
        twos: '8',
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Binary).toBe('00101010');
      expect(opts.Unsigned).toBe('42');
    });
  });

  describe('-1 @ 8-bit', () => {
    it('all bits set: Binary 11111111, Hex 0xff, Unsigned 255', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('-1', {
        twos: '8',
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Binary).toBe('11111111');
      expect(opts.Hex).toBe('0xff');
      expect(opts.Unsigned).toBe('255');
    });
  });

  describe('-1 @ 16-bit', () => {
    it('all 16 bits set, Unsigned 65535', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('-1', {
        twos: '16',
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Binary).toBe('1111111111111111');
      expect(opts.Unsigned).toBe('65535');
    });
  });

  describe('default width 8', () => {
    it('uses 8 bits when option has no numeric value', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('5', {
        twoscomplement: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Binary).toBe('00000101');
      expect(opts['Bit Width']).toBe('8');
    });
  });

  describe('out of range', () => {
    it('returns an error box for 200 in 8-bit (max signed = 127)', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('200', {
        twos: '8',
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toBeDefined();
      // error message should mention "fit" or the word "8"
      expect(opts.Error).toMatch(/fit|8/i);
    });

    it('returns an error box for -200 in 8-bit (min signed = -128)', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('-200', {
        twos: '8',
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toBeDefined();
      expect(opts.Error).toMatch(/fit|8/i);
    });
  });

  describe('invalid input', () => {
    it('returns empty array for non-integer input', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('abc', {
        twoscomplement: '8',
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for float input', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('3.14', {
        twoscomplement: '8',
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(TwosComplementBoxSource.name).toBe("Two's Complement");
      expect(TwosComplementBoxSource.tag).toBe('#');
      expect(TwosComplementBoxSource.kind).toBe('Convert');
      expect(typeof TwosComplementBoxSource.priority).toBe('number');
    });
  });
});
