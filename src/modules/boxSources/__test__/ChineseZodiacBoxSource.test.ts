import { describe, expect, it } from 'vitest';

import { ChineseZodiacBoxSource } from '../ChineseZodiacBoxSource';

describe('ChineseZodiacBoxSource', () => {
  describe('option gating', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await ChineseZodiacBoxSource.generateBoxes('2024', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for an unrelated option', async () => {
      const boxes = await ChineseZodiacBoxSource.generateBoxes('2024', {
        qrcode: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('triggers on ::shengxiao alias', async () => {
      const boxes = await ChineseZodiacBoxSource.generateBoxes('2024', {
        shengxiao: true,
      });
      expect(boxes).toHaveLength(1);
    });
  });

  describe('2024 — 甲辰 Wood Dragon', () => {
    it('animal is Dragon 龍', async () => {
      const boxes = await ChineseZodiacBoxSource.generateBoxes('2024', {
        chinesezodiac: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Animal).toContain('Dragon');
      expect(opts.Animal).toContain('龍');
    });

    it('stem-branch is 甲辰', async () => {
      const boxes = await ChineseZodiacBoxSource.generateBoxes('2024', {
        chinesezodiac: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Stem-Branch']).toBe('甲辰');
    });

    it('element is Wood (甲 = Wood Yang)', async () => {
      const boxes = await ChineseZodiacBoxSource.generateBoxes('2024', {
        chinesezodiac: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Element).toContain('Wood');
    });

    it('yin/yang is Yang', async () => {
      const boxes = await ChineseZodiacBoxSource.generateBoxes('2024', {
        chinesezodiac: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Yin/Yang']).toContain('Yang');
    });

    it('box name is Chinese Zodiac', async () => {
      const boxes = await ChineseZodiacBoxSource.generateBoxes('2024', {
        chinesezodiac: true,
      });
      expect(boxes[0].props.name).toBe('Chinese Zodiac');
    });

    it('priority matches source priority', async () => {
      const boxes = await ChineseZodiacBoxSource.generateBoxes('2024', {
        chinesezodiac: true,
      });
      expect(boxes[0].props.priority).toBe(ChineseZodiacBoxSource.priority);
    });
  });

  describe('2008 — 戊子 Earth Rat', () => {
    it('animal is Rat 鼠', async () => {
      const boxes = await ChineseZodiacBoxSource.generateBoxes('2008', {
        chinesezodiac: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Animal).toContain('Rat');
      expect(opts.Animal).toContain('鼠');
    });

    it('stem-branch is 戊子', async () => {
      const boxes = await ChineseZodiacBoxSource.generateBoxes('2008', {
        chinesezodiac: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Stem-Branch']).toBe('戊子');
    });

    it('element is Earth (戊 = Earth Yang)', async () => {
      const boxes = await ChineseZodiacBoxSource.generateBoxes('2008', {
        chinesezodiac: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Element).toContain('Earth');
    });
  });

  describe('2000 — 庚辰 Metal Dragon', () => {
    it('animal is Dragon 龍', async () => {
      const boxes = await ChineseZodiacBoxSource.generateBoxes('2000', {
        chinesezodiac: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Animal).toContain('Dragon');
      expect(opts.Animal).toContain('龍');
    });

    it('stem-branch is 庚辰', async () => {
      const boxes = await ChineseZodiacBoxSource.generateBoxes('2000', {
        chinesezodiac: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Stem-Branch']).toBe('庚辰');
    });

    it('element is Metal (庚 = Metal Yang)', async () => {
      const boxes = await ChineseZodiacBoxSource.generateBoxes('2000', {
        chinesezodiac: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Element).toContain('Metal');
    });
  });

  describe('1900 — 庚子 Metal Rat', () => {
    it('animal is Rat 鼠', async () => {
      const boxes = await ChineseZodiacBoxSource.generateBoxes('1900', {
        chinesezodiac: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Animal).toContain('Rat');
      expect(opts['Stem-Branch']).toBe('庚子');
    });
  });

  describe('option value as year (::chinesezodiac=2024)', () => {
    it('reads year from option value when it is numeric', async () => {
      const boxes = await ChineseZodiacBoxSource.generateBoxes('ignored', {
        chinesezodiac: '2024',
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Animal).toContain('Dragon');
      expect(opts['Stem-Branch']).toBe('甲辰');
    });
  });

  describe('invalid inputs', () => {
    it('returns an error box for non-numeric input "abc"', async () => {
      const boxes = await ChineseZodiacBoxSource.generateBoxes('abc', {
        chinesezodiac: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toBeDefined();
    });

    it('returns an error box for empty input', async () => {
      const boxes = await ChineseZodiacBoxSource.generateBoxes('', {
        chinesezodiac: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toBeDefined();
    });

    it('returns an error box for year 0', async () => {
      const boxes = await ChineseZodiacBoxSource.generateBoxes('0', {
        chinesezodiac: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toBeDefined();
    });

    it('returns an error box for negative-looking input "-2024"', async () => {
      const boxes = await ChineseZodiacBoxSource.generateBoxes('-2024', {
        chinesezodiac: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toBeDefined();
    });
  });

  describe('static metadata', () => {
    it('has correct name, tag, kind', () => {
      expect(ChineseZodiacBoxSource.name).toBe('Chinese Zodiac');
      expect(ChineseZodiacBoxSource.tag).toBe('#');
      expect(ChineseZodiacBoxSource.kind).toBe('Calculate');
      expect(typeof ChineseZodiacBoxSource.priority).toBe('number');
    });
  });
});
