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

    it('also triggers on ::baseconvert alias', async () => {
      const boxes = await RadixBoxSource.generateBoxes('ff', {
        baseconvert: '16:2',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Result).toBe('11111111');
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
