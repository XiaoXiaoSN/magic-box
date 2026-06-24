import { ChineseNumeralBoxSource } from '@modules/boxSources/ChineseNumeralBoxSource';
import { describe, expect, it } from 'vitest';

describe('ChineseNumeralBoxSource', () => {
  describe('no option key → empty', () => {
    it('returns [] when no option is present', async () => {
      const boxes = await ChineseNumeralBoxSource.generateBoxes('1234', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when an unrelated option is present', async () => {
      const boxes = await ChineseNumeralBoxSource.generateBoxes('1234', {
        base64: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('integer → Chinese numerals', () => {
    async function convert(input: string) {
      const boxes = await ChineseNumeralBoxSource.generateBoxes(input, {
        chinesenum: true,
      });
      expect(boxes).toHaveLength(1);
      return boxes[0].props.options as Record<string, string>;
    }

    it('converts 0 → 零', async () => {
      const opts = await convert('0');
      expect(opts.Everyday).toBe('零');
      expect(opts.Financial).toBe('零');
    });

    it('converts 10 → 十', async () => {
      const opts = await convert('10');
      expect(opts.Everyday).toBe('十');
    });

    it('converts 15 → 十五', async () => {
      const opts = await convert('15');
      expect(opts.Everyday).toBe('十五');
    });

    it('converts 20 → 二十', async () => {
      const opts = await convert('20');
      expect(opts.Everyday).toBe('二十');
    });

    it('converts 100 → 一百', async () => {
      const opts = await convert('100');
      expect(opts.Everyday).toBe('一百');
    });

    it('converts 110 → 一百一十', async () => {
      const opts = await convert('110');
      expect(opts.Everyday).toBe('一百一十');
    });

    it('converts 1001 → 一千零一 (zero-bridge, no double 零)', async () => {
      const opts = await convert('1001');
      expect(opts.Everyday).toBe('一千零一');
    });

    it('converts 1234 → 一千二百三十四 (everyday)', async () => {
      const opts = await convert('1234');
      expect(opts.Everyday).toBe('一千二百三十四');
    });

    it('converts 1234 → 壹仟貳佰參拾肆 (financial)', async () => {
      const opts = await convert('1234');
      expect(opts.Financial).toBe('壹仟貳佰參拾肆');
      // financial uses 仟/佰/拾, not 千/百/十
      expect(opts.Financial).toMatch(/^壹仟/);
    });

    it('converts 10001 → 一萬零一', async () => {
      const opts = await convert('10001');
      expect(opts.Everyday).toBe('一萬零一');
    });

    it('also triggers on ::chinesenumber alias', async () => {
      const boxes = await ChineseNumeralBoxSource.generateBoxes('5', {
        chinesenumber: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Everyday).toBe('五');
    });

    it('handles negative integers', async () => {
      const opts = await convert('-1');
      expect(opts.Everyday).toBe('負一');
      expect(opts.Number).toBe('-1');
    });

    it('returns error box for value exceeding MAX_VALUE', async () => {
      const boxes = await ChineseNumeralBoxSource.generateBoxes(
        '1000000000000',
        { chinesenum: true },
      );
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toBeTruthy();
    });
  });

  describe('Chinese numerals → integer', () => {
    async function parse(input: string) {
      const boxes = await ChineseNumeralBoxSource.generateBoxes(input, {
        chinesenum: true,
      });
      expect(boxes).toHaveLength(1);
      return boxes[0].props.options as Record<string, string>;
    }

    it('parses 一千二百三十四 → 1234', async () => {
      const opts = await parse('一千二百三十四');
      expect(opts.Number).toBe('1234');
    });

    it('parses 十五 → 15', async () => {
      const opts = await parse('十五');
      expect(opts.Number).toBe('15');
    });

    it('parses 一千零一 → 1001 (round-trip)', async () => {
      const opts = await parse('一千零一');
      expect(opts.Number).toBe('1001');
    });

    it('round-trips 1234 → 一千二百三十四 → 1234', async () => {
      const fwd = await ChineseNumeralBoxSource.generateBoxes('1234', {
        chinesenum: true,
      });
      const everyday = (fwd[0].props.options as Record<string, string>)
        .Everyday;
      expect(everyday).toBe('一千二百三十四');

      const rev = await ChineseNumeralBoxSource.generateBoxes(everyday, {
        chinesenum: true,
      });
      const num = (rev[0].props.options as Record<string, string>).Number;
      expect(num).toBe('1234');
    });

    it('returns an error box for unrecognised input', async () => {
      const boxes = await ChineseNumeralBoxSource.generateBoxes('hello', {
        chinesenum: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toBeTruthy();
    });
  });

  describe('plaintext output is non-empty k:v lines', () => {
    it('plaintext contains key: value pairs for int→chinese', async () => {
      const boxes = await ChineseNumeralBoxSource.generateBoxes('1234', {
        chinesenum: true,
      });
      const text = boxes[0].props.plaintextOutput;
      expect(text).toContain('Everyday: 一千二百三十四');
      expect(text).toContain('Financial: 壹仟貳佰參拾肆');
    });

    it('plaintext contains key: value pairs for chinese→int', async () => {
      const boxes = await ChineseNumeralBoxSource.generateBoxes(
        '一千二百三十四',
        { chinesenum: true },
      );
      const text = boxes[0].props.plaintextOutput;
      expect(text).toContain('Number: 1234');
    });
  });
});
