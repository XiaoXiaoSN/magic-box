import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { TwosComplementBoxSource } from '../TwosComplementBoxSource';

describe('TwosComplementBoxSource', () => {
  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(TwosComplementBoxSource.name).toBe("Two's Complement");
      expect(TwosComplementBoxSource.tag).toBe('#');
      expect(TwosComplementBoxSource.kind).toBe('Convert');
      expect(typeof TwosComplementBoxSource.priority).toBe('number');
    });
  });

  describe('generateBoxes - option gate', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('-42', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when unrelated options are provided', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('-42', {
        json: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - non-integer input', () => {
    it('returns [] for alphabetic input', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('abc', {
        twos: '8',
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for float input', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('3.14', {
        twos: '8',
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('', {
        twos: '8',
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - -42 at 8 bits', () => {
    it("produces correct two's-complement values for -42 ::twos=8", async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('-42', {
        twos: '8',
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Decimal).toBe('-42');
      expect(opts.Bits).toBe('8');
      expect(opts.Binary).toBe('11010110');
      expect(opts.Hex).toBe('d6');
      expect(opts.Unsigned).toBe('214');
    });

    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('-42', {
        twos: '8',
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('sets priority', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('-42', {
        twos: '8',
      });
      expect(boxes[0].props.priority).toBe(TwosComplementBoxSource.priority);
    });
  });

  describe('generateBoxes - positive value 5 at 8 bits', () => {
    it('produces correct values for 5 ::twos=8', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('5', {
        twos: '8',
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Binary).toBe('00000101');
      expect(opts.Hex).toBe('05');
      expect(opts.Unsigned).toBe('5');
      expect(opts.Decimal).toBe('5');
    });
  });

  describe('generateBoxes - -1 at 8 bits (all ones)', () => {
    it('produces all-ones pattern for -1 ::twos=8', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('-1', {
        twos: '8',
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Binary).toBe('11111111');
      expect(opts.Hex).toBe('ff');
      expect(opts.Unsigned).toBe('255');
    });
  });

  describe('generateBoxes - -1 at 16 bits', () => {
    it('produces 16 ones and ffff hex for -1 ::twoscomplement=16', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('-1', {
        twoscomplement: '16',
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Binary).toBe('1111111111111111');
      expect(opts.Hex).toBe('ffff');
      expect(opts.Bits).toBe('16');
    });
  });

  describe('generateBoxes - out-of-range input', () => {
    it('returns an error box for 200 ::twos=8 (max signed 8-bit is 127)', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('200', {
        twos: '8',
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      // box should mention the range/fit constraint
      expect(opts.Error).toMatch(/8/);
      expect(opts.Range).toMatch(/-128/);
      expect(opts.Range).toMatch(/127/);
    });

    it('returns an error box for -129 ::twos=8 (min signed 8-bit is -128)', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('-129', {
        twos: '8',
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toMatch(/8/);
    });
  });

  describe('generateBoxes - bit width defaults', () => {
    it('defaults to 8 bits when option value is boolean true', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('5', {
        twos: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Bits).toBe('8');
      expect(opts.Binary).toHaveLength(8);
    });

    it('defaults to 8 bits for invalid bit width string', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('5', {
        twos: 'invalid',
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Bits).toBe('8');
    });

    it('uses ::twoscomplement alias', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('-42', {
        twoscomplement: '8',
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Binary).toBe('11010110');
    });
  });

  describe('generateBoxes - boundary values', () => {
    it('handles max signed 8-bit value (127)', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('127', {
        twos: '8',
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Binary).toBe('01111111');
      expect(opts.Hex).toBe('7f');
    });

    it('handles min signed 8-bit value (-128)', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('-128', {
        twos: '8',
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Binary).toBe('10000000');
      expect(opts.Hex).toBe('80');
      expect(opts.Unsigned).toBe('128');
    });

    it('handles zero', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('0', {
        twos: '8',
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Binary).toBe('00000000');
      expect(opts.Hex).toBe('00');
      expect(opts.Unsigned).toBe('0');
    });
  });
});
