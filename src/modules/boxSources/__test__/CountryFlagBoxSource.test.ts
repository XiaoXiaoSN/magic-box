import { CountryFlagBoxSource } from '@modules/boxSources/CountryFlagBoxSource';
import { describe, expect, it } from 'vitest';

// regional indicator base code point (🇦 = U+1F1E6)
const RI_BASE = 0x1f1e6;

describe('CountryFlagBoxSource', () => {
  describe('no option key → empty array', () => {
    it('returns [] when no ::flag option is present', async () => {
      const boxes = await CountryFlagBoxSource.generateBoxes('US', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when an unrelated option is present', async () => {
      const boxes = await CountryFlagBoxSource.generateBoxes('US', {
        qrcode: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('code → flag', () => {
    it('converts US to 🇺🇸 (U+1F1FA U+1F1F8)', async () => {
      const boxes = await CountryFlagBoxSource.generateBoxes('US', {
        flag: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Code).toBe('US');

      const flag = opts.Flag;
      // verify the two regional indicator code points
      const cp0 = flag.codePointAt(0);
      const cp1 = flag.codePointAt(2); // each regional indicator is 2 UTF-16 units
      expect(cp0).toBe(0x1f1fa); // 🇺 = RI_BASE + ('U' - 'A') = 0x1F1E6 + 20
      expect(cp1).toBe(0x1f1f8); // 🇸 = RI_BASE + ('S' - 'A') = 0x1F1E6 + 18
      expect(flag).toBe('🇺🇸');
    });

    it('converts lowercase jp to 🇯🇵', async () => {
      const boxes = await CountryFlagBoxSource.generateBoxes('jp', {
        flag: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Code).toBe('JP');
      expect(opts.Flag).toBe('🇯🇵');
    });

    it('includes Name "United States" for US', async () => {
      const boxes = await CountryFlagBoxSource.generateBoxes('US', {
        flag: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Name).toBe('United States');
    });

    it('accepts ::countryflag option key', async () => {
      const boxes = await CountryFlagBoxSource.generateBoxes('US', {
        countryflag: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Flag).toBe('🇺🇸');
    });

    it('verifies US flag code points via RI_BASE arithmetic', () => {
      // U is the 21st letter (0-indexed: 20); S is the 19th (0-indexed: 18)
      expect(RI_BASE + 20).toBe(0x1f1fa);
      expect(RI_BASE + 18).toBe(0x1f1f8);
    });
  });

  describe('flag → code (reverse)', () => {
    it('converts 🇺🇸 back to US', async () => {
      const boxes = await CountryFlagBoxSource.generateBoxes('🇺🇸', {
        flag: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Code).toBe('US');
    });

    it('converts 🇫🇷 to FR', async () => {
      const boxes = await CountryFlagBoxSource.generateBoxes('🇫🇷', {
        flag: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Code).toBe('FR');
    });

    it('round-trips US → 🇺🇸 → US', async () => {
      const forward = await CountryFlagBoxSource.generateBoxes('US', {
        flag: true,
      });
      const flag = (forward[0].props.options as Record<string, string>).Flag;

      const reverse = await CountryFlagBoxSource.generateBoxes(flag, {
        flag: true,
      });
      const code = (reverse[0].props.options as Record<string, string>).Code;
      expect(code).toBe('US');
    });
  });

  describe('invalid input → info box', () => {
    it('returns an info box for single-letter input "X"', async () => {
      const boxes = await CountryFlagBoxSource.generateBoxes('X', {
        flag: true,
      });
      expect(boxes).toHaveLength(1);
      // the box name is still 'Country Flag'
      expect(boxes[0].props.name).toBe('Country Flag');
      // the output mentions country code or flag
      const text = boxes[0].props.plaintextOutput.toLowerCase();
      expect(text).toMatch(/country.*code|flag/);
    });

    it('returns an info box for "hello" (more than 2 letters)', async () => {
      const boxes = await CountryFlagBoxSource.generateBoxes('hello', {
        flag: true,
      });
      expect(boxes).toHaveLength(1);
      const text = boxes[0].props.plaintextOutput.toLowerCase();
      expect(text).toMatch(/country.*code|flag/);
    });
  });

  describe('box metadata', () => {
    it('sets priority to 10', async () => {
      const boxes = await CountryFlagBoxSource.generateBoxes('TW', {
        flag: true,
      });
      expect(boxes[0].props.priority).toBe(10);
    });

    it('sets box name to "Country Flag"', async () => {
      const boxes = await CountryFlagBoxSource.generateBoxes('TW', {
        flag: true,
      });
      expect(boxes[0].props.name).toBe('Country Flag');
    });
  });
});
