import { describe, expect, it } from 'vitest';

import { RadixBoxSource } from '../RadixBoxSource';

describe('RadixBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns empty array when no radix option is present', async () => {
      const boxes = await RadixBoxSource.generateBoxes('ff', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array when unrelated options are present', async () => {
      const boxes = await RadixBoxSource.generateBoxes('ff', { json: true });
      expect(boxes).toHaveLength(0);
    });

    it('converts hex ff to binary (base 16 → base 2)', async () => {
      const boxes = await RadixBoxSource.generateBoxes('ff', { radix: '16:2' });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options;
      expect(opts?.Result).toBe('11111111');
      expect(opts?.Decimal).toBe('255');
      expect(opts?.From).toBe('base 16');
      expect(opts?.To).toBe('base 2');
      expect(opts?.Input).toBe('ff');
    });

    it('accepts a base-matching prefix and grouped whitespace', async () => {
      const hex = await RadixBoxSource.generateBoxes('0xff', {
        radix: '16:10',
      });
      const binary = await RadixBoxSource.generateBoxes('1111 0000', {
        radix: '2:16',
      });
      expect(hex[0].props.options?.Result).toBe('255');
      expect(binary[0].props.options?.Result).toBe('f0');
    });

    it.each([
      ['0bad', '16:10', '2989'],
      ['0b00', '16:10', '2816'],
      ['-0bad', '16:10', '-2989'],
      ['0x', '36:10', '33'],
      ['0O', '36:10', '24'],
    ])('converts %s with explicit bases %s', async (input, radix, expected) => {
      const boxes = await RadixBoxSource.generateBoxes(input, { radix });
      expect(boxes[0].props.options?.Result).toBe(expected);
      expect(boxes[0].props.options?.Decimal).toBe(expected);
    });

    it.each([
      ['0xff', '2:10'],
      ['0xff', '10:2'],
      ['0b102', '2:10'],
      ['0o8', '8:10'],
    ])('rejects invalid digits in %s with explicit bases %s', async (input, radix) => {
      const boxes = await RadixBoxSource.generateBoxes(input, { radix });
      expect(boxes[0].props.options?.Info).toMatch(/digit not valid/i);
    });

    it.each([
      ['0B101', '2:10', '5'],
      ['-0O17', '8:10', '-15'],
      ['-0X FF', '16:10', '-255'],
    ])('strips the matching prefix in %s with explicit bases %s', async (input, radix, expected) => {
      const boxes = await RadixBoxSource.generateBoxes(input, { radix });
      expect(boxes[0].props.options?.Result).toBe(expected);
    });

    it('rejects a matching prefix without digits', async () => {
      const boxes = await RadixBoxSource.generateBoxes('0x', {
        radix: '16:10',
      });
      expect(boxes[0].props.options?.Info).toMatch(/empty/i);
    });

    it('rejects extra radix segments', async () => {
      const boxes = await RadixBoxSource.generateBoxes('ff', {
        radix: '16:2:8',
      });
      expect(boxes[0].props.options?.Info).toMatch(/FROM|base/i);
    });

    it('converts decimal 255 to hex (base 10 → base 16)', async () => {
      const boxes = await RadixBoxSource.generateBoxes('255', {
        radix: '10:16',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Result).toBe('ff');
    });

    it('converts negative decimal -10 to binary', async () => {
      const boxes = await RadixBoxSource.generateBoxes('-10', {
        radix: '10:2',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Result).toBe('-1010');
    });

    it('converts z in base 36 to decimal', async () => {
      const boxes = await RadixBoxSource.generateBoxes('z', { radix: '36:10' });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Result).toBe('35');
      expect(boxes[0].props.options?.Decimal).toBe('35');
    });

    it('returns error box for digit not valid in the given base (9 in base 2)', async () => {
      const boxes = await RadixBoxSource.generateBoxes('9', { radix: '2:10' });
      expect(boxes).toHaveLength(1);
      const info = boxes[0].props.options?.Info as string;
      expect(info).toMatch(/invalid|not valid/i);
    });

    it('returns format hint box when spec has no colon (bare base, no :to)', async () => {
      const boxes = await RadixBoxSource.generateBoxes('ff', { radix: '16' });
      expect(boxes).toHaveLength(1);
      const info = boxes[0].props.options?.Info as string;
      expect(info).toMatch(/FROM:TO|format/i);
    });

    it('returns format hint box when option value is bare true (::radix with no =value)', async () => {
      const boxes = await RadixBoxSource.generateBoxes('ff', { radix: true });
      expect(boxes).toHaveLength(1);
      const info = boxes[0].props.options?.Info as string;
      expect(info).toMatch(/FROM:TO|format/i);
    });

    it('returns error box when base is out of range (1 or 40)', async () => {
      const boxes1 = await RadixBoxSource.generateBoxes('ff', {
        radix: '1:40',
      });
      expect(boxes1).toHaveLength(1);
      const info = boxes1[0].props.options?.Info as string;
      expect(info).toMatch(/2-36/);
    });

    it('respects explicit digits through the ::baseconvert alias', async () => {
      const boxes = await RadixBoxSource.generateBoxes('0bad', {
        baseconvert: '16:10',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Result).toBe('2989');
    });

    it('handles large values exactly via BigInt', async () => {
      // 2^64 in decimal = 18446744073709551616; convert to hex
      const input = '18446744073709551616';
      const boxes = await RadixBoxSource.generateBoxes(input, {
        radix: '10:16',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Result).toBe('10000000000000000');
    });
  });
});
