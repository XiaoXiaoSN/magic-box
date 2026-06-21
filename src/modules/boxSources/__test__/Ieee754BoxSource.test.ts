import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { Ieee754BoxSource } from '../Ieee754BoxSource';

describe('Ieee754BoxSource', () => {
  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(Ieee754BoxSource.name).toBe('IEEE 754');
      expect(Ieee754BoxSource.priority).toBe(10);
    });
  });

  describe('option gating', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await Ieee754BoxSource.generateBoxes('3.14', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty options object', async () => {
      const boxes = await Ieee754BoxSource.generateBoxes('3.14', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for unrelated options', async () => {
      const boxes = await Ieee754BoxSource.generateBoxes('3.14', {
        hash: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('invalid input', () => {
    it('returns [] for non-numeric string', async () => {
      const boxes = await Ieee754BoxSource.generateBoxes('xyz', {
        ieee754: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty string', async () => {
      const boxes = await Ieee754BoxSource.generateBoxes('', { ieee754: true });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for partial hex (not 8 or 16 digits)', async () => {
      const boxes = await Ieee754BoxSource.generateBoxes('0xdeadbeef00', {
        ieee754: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('float encoding — double (64-bit)', () => {
    it('3.14 → Double (hex) 0x40091eb851eb851f', async () => {
      const boxes = await Ieee754BoxSource.generateBoxes('3.14', {
        ieee754: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.['Double (hex)']).toBe(
        '0x40091eb851eb851f',
      );
    });

    it('1.0 → Double (hex) 0x3ff0000000000000', async () => {
      const boxes = await Ieee754BoxSource.generateBoxes('1.0', {
        ieee754: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.['Double (hex)']).toBe(
        '0x3ff0000000000000',
      );
    });

    it('0.5 → Double (hex) 0x3fe0000000000000', async () => {
      const boxes = await Ieee754BoxSource.generateBoxes('0.5', {
        ieee754: true,
      });
      expect(boxes[0].props.options?.['Double (hex)']).toBe(
        '0x3fe0000000000000',
      );
    });

    it('-2 → Double (hex) 0xc000000000000000', async () => {
      const boxes = await Ieee754BoxSource.generateBoxes('-2', {
        ieee754: true,
      });
      expect(boxes[0].props.options?.['Double (hex)']).toBe(
        '0xc000000000000000',
      );
    });

    it('NaN → Double (hex) 0x7ff8000000000000', async () => {
      const boxes = await Ieee754BoxSource.generateBoxes('NaN', {
        ieee754: true,
      });
      expect(boxes[0].props.options?.['Double (hex)']).toBe(
        '0x7ff8000000000000',
      );
    });
  });

  describe('float encoding — single (32-bit)', () => {
    it('0.5 → Single (hex) 0x3f000000', async () => {
      const boxes = await Ieee754BoxSource.generateBoxes('0.5', {
        ieee754: true,
      });
      expect(boxes[0].props.options?.['Single (hex)']).toBe('0x3f000000');
    });

    it('includes Single (value) round-trip for 0.5', async () => {
      const boxes = await Ieee754BoxSource.generateBoxes('0.5', {
        ieee754: true,
      });
      // 0.5 is exactly representable in both precisions
      expect(boxes[0].props.options?.['Single (value)']).toBe('0.5');
    });
  });

  describe('float encoding — output shape', () => {
    it('box uses KeyValueBoxTemplate', async () => {
      const boxes = await Ieee754BoxSource.generateBoxes('1.0', {
        ieee754: true,
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('box name is "IEEE 754"', async () => {
      const boxes = await Ieee754BoxSource.generateBoxes('1.0', {
        ieee754: true,
      });
      expect(boxes[0].props.name).toBe('IEEE 754');
    });

    it('options include all five expected keys', async () => {
      const boxes = await Ieee754BoxSource.generateBoxes('1.0', {
        ieee754: true,
      });
      const opts = boxes[0].props.options ?? {};
      expect(opts).toHaveProperty('Value');
      expect(opts).toHaveProperty('Double (hex)');
      expect(opts).toHaveProperty('Double (bits)');
      expect(opts).toHaveProperty('Single (hex)');
      expect(opts).toHaveProperty('Single (value)');
    });

    it('Double (bits) has sign + exponent + mantissa separated by spaces', async () => {
      const boxes = await Ieee754BoxSource.generateBoxes('1.0', {
        ieee754: true,
      });
      const bits = boxes[0].props.options?.['Double (bits)'] as string;
      const parts = bits.split(' ');
      expect(parts).toHaveLength(3);
      expect(parts[0]).toHaveLength(1); // sign: 1 bit
      expect(parts[1]).toHaveLength(11); // exponent: 11 bits
      expect(parts[2]).toHaveLength(52); // mantissa: 52 bits
    });

    it('triggers on ::floatbits option as well', async () => {
      const boxes = await Ieee754BoxSource.generateBoxes('1.0', {
        floatbits: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.['Double (hex)']).toBe(
        '0x3ff0000000000000',
      );
    });
  });

  describe('hex decode — double (16 hex digits)', () => {
    it('0x40091eb851eb851f → Value 3.14', async () => {
      const boxes = await Ieee754BoxSource.generateBoxes('0x40091eb851eb851f', {
        ieee754: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Value).toBe('3.14');
      expect(boxes[0].props.options?.Type).toBe('double');
    });

    it('0x3ff0000000000000 → Value 1', async () => {
      const boxes = await Ieee754BoxSource.generateBoxes('0x3ff0000000000000', {
        ieee754: true,
      });
      expect(boxes[0].props.options?.Value).toBe('1');
    });
  });

  describe('hex decode — single (8 hex digits)', () => {
    it('0x3f000000 → Value 0.5, Type single', async () => {
      const boxes = await Ieee754BoxSource.generateBoxes('0x3f000000', {
        ieee754: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Value).toBe('0.5');
      expect(boxes[0].props.options?.Type).toBe('single');
    });
  });

  describe('hex decode — output shape', () => {
    it('box uses KeyValueBoxTemplate', async () => {
      const boxes = await Ieee754BoxSource.generateBoxes('0x3f000000', {
        ieee754: true,
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('options include Hex, Value, Type keys', async () => {
      const boxes = await Ieee754BoxSource.generateBoxes('0x3f000000', {
        ieee754: true,
      });
      const opts = boxes[0].props.options ?? {};
      expect(opts).toHaveProperty('Hex');
      expect(opts).toHaveProperty('Value');
      expect(opts).toHaveProperty('Type');
    });
  });
});
