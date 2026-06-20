import { describe, expect, it } from 'vitest';

import { parseInput, parseOptionsForChips } from '../parseOptions';

describe('parseInput', () => {
  describe('option on the first line (no preceding text)', () => {
    it('parses a bare flag on line 1', () => {
      const [input, options] = parseInput('::qrcode');
      expect(input).toBe('');
      expect(options).toEqual({ qrcode: true });
    });

    it('parses a key=value directive on line 1', () => {
      const [input, options] = parseInput('::locale=tw');
      expect(input).toBe('');
      expect(options).toEqual({ locale: 'tw' });
    });

    it('parses a first-line option followed by body text', () => {
      const [input, options] = parseInput('::uuid\nsome text');
      expect(input).toBe('some text');
      expect(options).toEqual({ uuid: true });
    });

    it('parses multiple first-line and subsequent options', () => {
      const [input, options] = parseInput('::qrcode\nhello\n::locale=tw');
      expect(input).toBe('hello');
      expect(options).toEqual({ qrcode: true, locale: 'tw' });
    });
  });

  describe('option after a newline (existing behaviour)', () => {
    it('parses a bare flag on a later line', () => {
      const [input, options] = parseInput('hello world\n::qrcode');
      expect(input).toBe('hello world');
      expect(options).toEqual({ qrcode: true });
    });

    it('parses a key=value directive on a later line', () => {
      const [input, options] = parseInput('hello\n::locale=en');
      expect(input).toBe('hello');
      expect(options).toEqual({ locale: 'en' });
    });

    it('normalises option keys to lowercase', () => {
      const [input, options] = parseInput('text\n::MyOpt=val');
      expect(input).toBe('text');
      expect(options).toEqual({ myopt: 'val' });
    });
  });

  describe('residual input trimming', () => {
    it('strips leading/trailing blank lines left after option removal', () => {
      const [input] = parseInput('::qrcode\n\nhello\n\n');
      expect(input).toBe('hello');
    });

    it('returns empty string when all lines are directives', () => {
      const [input, options] = parseInput('::a\n::b=1');
      expect(input).toBe('');
      expect(options).toEqual({ a: true, b: '1' });
    });
  });

  describe('no options', () => {
    it('returns the input unchanged when no directives are present', () => {
      const [input, options] = parseInput('plain text');
      expect(input).toBe('plain text');
      expect(options).toEqual({});
    });
  });
});

describe('parseOptionsForChips', () => {
  describe('option on the first line (no preceding text)', () => {
    it('parses a bare flag on line 1', () => {
      const opts = parseOptionsForChips('::qrcode');
      expect(opts).toEqual({ qrcode: true });
    });

    it('parses a key=value directive on line 1', () => {
      const opts = parseOptionsForChips('::locale=tw');
      expect(opts).toEqual({ locale: 'tw' });
    });

    it('parses a first-line option followed by body text', () => {
      const opts = parseOptionsForChips('::uuid\nsome text');
      expect(opts).toEqual({ uuid: true });
    });
  });

  describe('option after a newline (existing behaviour)', () => {
    it('parses directives on later lines', () => {
      const opts = parseOptionsForChips('hello\n::qrcode\n::locale=en');
      expect(opts).toEqual({ qrcode: true, locale: 'en' });
    });

    it('normalises option keys to lowercase', () => {
      const opts = parseOptionsForChips('text\n::MyOpt=val');
      expect(opts).toEqual({ myopt: 'val' });
    });
  });

  describe('no options', () => {
    it('returns an empty object when no directives are present', () => {
      const opts = parseOptionsForChips('plain text');
      expect(opts).toEqual({});
    });
  });
});
