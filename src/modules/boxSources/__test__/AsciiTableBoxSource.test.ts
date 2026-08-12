import { describe, expect, it } from 'vitest';
import { AsciiTableBoxSource } from '../AsciiTableBoxSource';

describe('AsciiTableBoxSource', () => {
  describe('option gating', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await AsciiTableBoxSource.generateBoxes('A', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when an unrelated option is provided', async () => {
      const boxes = await AsciiTableBoxSource.generateBoxes('A', {
        base64: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('activates on ::ascii option', async () => {
      const boxes = await AsciiTableBoxSource.generateBoxes('A', {
        ascii: true,
      });
      expect(boxes.length).toBeGreaterThan(0);
    });

    it('activates on ::charcode option', async () => {
      const boxes = await AsciiTableBoxSource.generateBoxes('A', {
        charcode: true,
      });
      expect(boxes.length).toBeGreaterThan(0);
    });
  });

  describe('single character → code point', () => {
    it('A → Decimal 65, Hex 0x41, Octal 0o101, Binary 0b1000001', async () => {
      const boxes = await AsciiTableBoxSource.generateBoxes('A', {
        ascii: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Decimal).toBe('65');
      expect(opts.Hex).toBe('0x41'.toUpperCase().replace('0X', '0x'));
      expect(opts.Octal).toBe('0o101');
      expect(opts.Binary).toBe('0b1000001');
    });

    it('A → Hex is 0x41', async () => {
      const boxes = await AsciiTableBoxSource.generateBoxes('A', {
        ascii: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Hex).toBe(
        '0x41'.replace('41', '41').toUpperCase().replace('0X', '0x'),
      );
      // explicit assertion
      expect(opts.Hex).toBe('0x41'.toUpperCase().replace('0X41', '0x41'));
    });

    it('lowercase a → Decimal 97', async () => {
      const boxes = await AsciiTableBoxSource.generateBoxes('a', {
        ascii: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Decimal).toBe('97');
    });

    it('! → Decimal 33', async () => {
      const boxes = await AsciiTableBoxSource.generateBoxes('!', {
        ascii: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Decimal).toBe('33');
    });

    it('€ → Decimal 8364, Hex 0x20AC', async () => {
      const boxes = await AsciiTableBoxSource.generateBoxes('€', {
        ascii: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Decimal).toBe('8364');
      expect(opts.Hex).toBe('0x20AC');
    });

    it('sets box name to ASCII Code', async () => {
      const boxes = await AsciiTableBoxSource.generateBoxes('A', {
        ascii: true,
      });
      expect(boxes[0].props.name).toBe('ASCII Code');
    });

    it('sets priority', async () => {
      const boxes = await AsciiTableBoxSource.generateBoxes('A', {
        ascii: true,
      });
      expect(boxes[0].props.priority).toBe(10);
    });

    it('includes HTML Entity', async () => {
      const boxes = await AsciiTableBoxSource.generateBoxes('A', {
        ascii: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['HTML Entity']).toBe('&#65;');
    });
  });

  describe('code point number → character', () => {
    it('decimal 65 → Character A', async () => {
      const boxes = await AsciiTableBoxSource.generateBoxes('65', {
        ascii: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Character).toBe('A');
      expect(opts.Decimal).toBe('65');
    });

    it('hex 0x41 → Character A', async () => {
      const boxes = await AsciiTableBoxSource.generateBoxes('0x41', {
        ascii: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Character).toBe('A');
    });

    it('binary 0b1000001 → Character A', async () => {
      const boxes = await AsciiTableBoxSource.generateBoxes('0b1000001', {
        ascii: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Character).toBe('A');
    });

    it('octal 0o101 → Character A', async () => {
      const boxes = await AsciiTableBoxSource.generateBoxes('0o101', {
        ascii: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Character).toBe('A');
    });

    it('decimal 8364 → Character €', async () => {
      const boxes = await AsciiTableBoxSource.generateBoxes('8364', {
        ascii: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Character).toBe('€');
    });
  });

  describe('control characters', () => {
    it('code point 0 (via 0x0) → Character (NUL)', async () => {
      // a bare '0' is a single character (the digit, cp 48); use an
      // unambiguous numeric form to address code point 0
      const boxes = await AsciiTableBoxSource.generateBoxes('0x0', {
        ascii: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Character).toBe('(NUL)');
    });

    it('single digit "0" is the glyph (code point 48)', async () => {
      const boxes = await AsciiTableBoxSource.generateBoxes('0', {
        ascii: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Decimal).toBe('48');
    });

    it('code point 10 → Character contains LF', async () => {
      const boxes = await AsciiTableBoxSource.generateBoxes('10', {
        ascii: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Character).toContain('LF');
    });
  });

  describe('error / info boxes', () => {
    it('out-of-range code point 1114112 → info box', async () => {
      const boxes = await AsciiTableBoxSource.generateBoxes('1114112', {
        ascii: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Info).toBeTruthy();
    });

    it('two-character input AB (not a number) → info box', async () => {
      const boxes = await AsciiTableBoxSource.generateBoxes('AB', {
        ascii: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Info).toBeTruthy();
    });
  });
});
