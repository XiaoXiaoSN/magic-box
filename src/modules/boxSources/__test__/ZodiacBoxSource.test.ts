import { describe, expect, it } from 'vitest';

import { ZodiacBoxSource } from '../ZodiacBoxSource';

describe('ZodiacBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns empty array when no zodiac option is present', async () => {
      const boxes = await ZodiacBoxSource.generateBoxes('03-21', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array when unrelated options are present', async () => {
      const boxes = await ZodiacBoxSource.generateBoxes('03-21', {
        qrcode: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns a box for ::zodiac option', async () => {
      const boxes = await ZodiacBoxSource.generateBoxes('03-21', {
        zodiac: true,
      });
      expect(boxes).toHaveLength(1);
    });

    it('returns a box for ::starsign option', async () => {
      const boxes = await ZodiacBoxSource.generateBoxes('03-21', {
        starsign: true,
      });
      expect(boxes).toHaveLength(1);
    });

    describe('sign determination', () => {
      async function getOptions(input: string) {
        const boxes = await ZodiacBoxSource.generateBoxes(input, {
          zodiac: true,
        });
        expect(boxes).toHaveLength(1);
        return boxes[0].props.options as Record<string, string>;
      }

      it('03-21 → Aries (start of Aries, Fire)', async () => {
        const opts = await getOptions('03-21');
        expect(opts.Sign).toBe('Aries');
        expect(opts.Element).toBe('Fire');
        expect(opts.Symbol).toBe('♈');
      });

      it('2000-07-04 → Cancer (YYYY-MM-DD format, Water)', async () => {
        const opts = await getOptions('2000-07-04');
        expect(opts.Sign).toBe('Cancer');
        expect(opts.Element).toBe('Water');
      });

      it('12-25 → Capricorn (Dec 25, year-end wrap, Earth)', async () => {
        const opts = await getOptions('12-25');
        expect(opts.Sign).toBe('Capricorn');
        expect(opts.Element).toBe('Earth');
      });

      it('01-15 → Capricorn (Jan 15, still within Capricorn until Jan 19)', async () => {
        const opts = await getOptions('01-15');
        expect(opts.Sign).toBe('Capricorn');
      });

      it('01-20 → Aquarius (boundary start Jan 20)', async () => {
        const opts = await getOptions('01-20');
        expect(opts.Sign).toBe('Aquarius');
      });

      it('02-19 → Pisces (boundary start Feb 19)', async () => {
        const opts = await getOptions('02-19');
        expect(opts.Sign).toBe('Pisces');
      });

      it('04-19 → Aries (last day of Aries)', async () => {
        const opts = await getOptions('04-19');
        expect(opts.Sign).toBe('Aries');
      });

      it('04-20 → Taurus (first day of Taurus)', async () => {
        const opts = await getOptions('04-20');
        expect(opts.Sign).toBe('Taurus');
      });

      it('01-19 → Capricorn (last day of Capricorn)', async () => {
        const opts = await getOptions('01-19');
        expect(opts.Sign).toBe('Capricorn');
      });
    });

    describe('slash separator support', () => {
      it('accepts MM/DD format', async () => {
        const boxes = await ZodiacBoxSource.generateBoxes('03/21', {
          zodiac: true,
        });
        const opts = boxes[0].props.options as Record<string, string>;
        expect(opts.Sign).toBe('Aries');
      });

      it('accepts YYYY/MM/DD format', async () => {
        const boxes = await ZodiacBoxSource.generateBoxes('2000/07/04', {
          zodiac: true,
        });
        const opts = boxes[0].props.options as Record<string, string>;
        expect(opts.Sign).toBe('Cancer');
      });
    });

    describe('flexible date/time formats', () => {
      it('accepts datetime string YYYY-MM-DDTHH:mm:ssZ', async () => {
        const boxes = await ZodiacBoxSource.generateBoxes(
          '2026-06-25T13:05:40+08:00',
          {
            zodiac: true,
          },
        );
        const opts = boxes[0].props.options as Record<string, string>;
        expect(opts.Sign).toBe('Cancer');
      });

      it('accepts Month Name day format', async () => {
        const boxes = await ZodiacBoxSource.generateBoxes('June 25', {
          zodiac: true,
        });
        const opts = boxes[0].props.options as Record<string, string>;
        expect(opts.Sign).toBe('Cancer');
      });

      it('accepts UNIX timestamp', async () => {
        // 1735794245 is Jan 2, 2025 (Capricorn)
        const boxes = await ZodiacBoxSource.generateBoxes('1735794245', {
          zodiac: true,
        });
        const opts = boxes[0].props.options as Record<string, string>;
        expect(opts.Sign).toBe('Capricorn');
      });
    });

    describe('output shape', () => {
      it('box is named Zodiac Sign with correct keys', async () => {
        const boxes = await ZodiacBoxSource.generateBoxes('03-21', {
          zodiac: true,
        });
        const box = boxes[0];
        expect(box.props.name).toBe('Zodiac Sign');
        expect(box.props.priority).toBe(10);
        const opts = box.props.options as Record<string, string>;
        expect(opts).toHaveProperty('Date', '03-21');
        expect(opts).toHaveProperty('Sign');
        expect(opts).toHaveProperty('Symbol');
        expect(opts).toHaveProperty('Element');
        expect(opts).toHaveProperty('Dates');
      });

      it('plaintextOutput contains key: value lines', async () => {
        const boxes = await ZodiacBoxSource.generateBoxes('03-21', {
          zodiac: true,
        });
        const text = boxes[0].props.plaintextOutput;
        expect(text).toContain('Sign: Aries');
        expect(text).toContain('Element: Fire');
      });
    });

    describe('invalid input', () => {
      it('returns an error box for month 13', async () => {
        const boxes = await ZodiacBoxSource.generateBoxes('13-01', {
          zodiac: true,
        });
        expect(boxes).toHaveLength(1);
        const opts = boxes[0].props.options as Record<string, string>;
        expect(opts).toHaveProperty('Error');
      });

      it('returns an error box for free-text input', async () => {
        const boxes = await ZodiacBoxSource.generateBoxes('hello', {
          zodiac: true,
        });
        expect(boxes).toHaveLength(1);
        const opts = boxes[0].props.options as Record<string, string>;
        expect(opts).toHaveProperty('Error');
      });
    });
  });
});
