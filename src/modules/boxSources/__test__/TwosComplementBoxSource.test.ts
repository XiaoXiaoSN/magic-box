import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { TwosComplementBoxSource } from '../TwosComplementBoxSource';

describe('TwosComplementBoxSource', () => {
  describe('no option → empty array', () => {
    it('returns [] when no twos option is present', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('-42', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty options object', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('-42', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for unrelated option', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('-42', {
        base64: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe("-42 in 8-bit two's complement", () => {
    it('produces correct Binary, Hex, and Unsigned for -42 at 8 bits', async () => {
      // -42 + 256 = 214 = 0xD6 = 11010110
      const boxes = await TwosComplementBoxSource.generateBoxes('-42', {
        twos: '8',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Binary: '11010110',
        Hex: '0xd6',
        Unsigned: '214',
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });
  });

  describe('positive 42 in 8-bit', () => {
    it('produces correct Binary, Hex, and Unsigned for 42 at 8 bits', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('42', {
        twos: '8',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Binary: '00101010',
        Hex: '0x2a',
        Unsigned: '42',
      });
    });
  });

  describe('-1 in 8-bit', () => {
    it('produces all-ones pattern for -1 at 8 bits', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('-1', {
        twos: '8',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Binary: '11111111',
        Hex: '0xff',
        Unsigned: '255',
      });
    });
  });

  describe('-1 in 16-bit', () => {
    it('produces all-ones 16-bit pattern for -1', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('-1', {
        twos: '16',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Binary: '1111111111111111',
        Unsigned: '65535',
      });
    });
  });

  describe('boundary: -128 and 128 at 8 bits', () => {
    it('-128 is the minimum signed 8-bit value and has Unsigned 128', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('-128', {
        twos: '8',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Unsigned: '128',
        Binary: '10000000',
        Hex: '0x80',
      });
    });

    it('128 is out of range for 8-bit signed and returns an error box', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('128', {
        twos: '8',
      });
      expect(boxes).toHaveLength(1);
      // the error box should not have Binary/Hex/Unsigned fields
      expect(boxes[0].props.options).toHaveProperty('Error');
      expect(boxes[0].props.options).not.toHaveProperty('Binary');
    });
  });

  describe('default bits when no value specified for ::twos', () => {
    it('defaults to 8 bits when option value is boolean true', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('-42', {
        twos: true,
      });
      expect(boxes).toHaveLength(1);
      // 8-bit two's complement of -42
      expect(boxes[0].props.options).toMatchObject({
        Bits: '8',
        Unsigned: '214',
      });
    });
  });

  describe('::twoscomplement alias', () => {
    it('triggers on ::twoscomplement option key', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('-42', {
        twoscomplement: '8',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Binary: '11010110',
        Hex: '0xd6',
        Unsigned: '214',
      });
    });
  });

  describe('-1 in 64-bit (BigInt precision)', () => {
    it('produces exact unsigned 2^64-1 for -1 at 64 bits', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('-1', {
        twos: '64',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Unsigned: '18446744073709551615',
        Binary: '1'.repeat(64),
      });
    });
  });

  describe('invalid non-integer input', () => {
    it('returns a single error box for alphabetic input', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('abc', {
        twos: '8',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toHaveProperty('Error');
      expect(boxes[0].props.options).not.toHaveProperty('Binary');
    });

    it('returns a single error box for float input', async () => {
      const boxes = await TwosComplementBoxSource.generateBoxes('3.14', {
        twos: '8',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toHaveProperty('Error');
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
