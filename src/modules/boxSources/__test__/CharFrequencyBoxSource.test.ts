import { CharFrequencyBoxSource } from '@modules/boxSources/CharFrequencyBoxSource';
import { describe, expect, it } from 'vitest';

describe('CharFrequencyBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when no option key is present', async () => {
      const boxes = await CharFrequencyBoxSource.generateBoxes('hello', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input', async () => {
      const boxes = await CharFrequencyBoxSource.generateBoxes('', {
        charfreq: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for whitespace-only input', async () => {
      const boxes = await CharFrequencyBoxSource.generateBoxes('   ', {
        charfreq: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('counts characters correctly for "hello"', async () => {
      const boxes = await CharFrequencyBoxSource.generateBoxes('hello', {
        charfreq: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Total Characters']).toBe('5');
      expect(opts['Unique Characters']).toBe('4');
      expect(opts.l).toBe('2');
      expect(opts.h).toBe('1');
      expect(opts.e).toBe('1');
      expect(opts.o).toBe('1');
    });

    it('counts characters correctly for "aaa"', async () => {
      const boxes = await CharFrequencyBoxSource.generateBoxes('aaa', {
        charfreq: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Total Characters']).toBe('3');
      expect(opts['Unique Characters']).toBe('1');
      expect(opts.a).toBe('3');
    });

    it('counts characters correctly for "hello world" including SPACE token', async () => {
      const boxes = await CharFrequencyBoxSource.generateBoxes('hello world', {
        charfreq: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Total Characters']).toBe('11');
      expect(opts.l).toBe('3');
      expect(opts.o).toBe('2');
      expect(opts.SPACE).toBe('1');
    });

    it('counts emoji as single code points', async () => {
      const boxes = await CharFrequencyBoxSource.generateBoxes('😀😀', {
        charfreq: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      // for..of counts code points, so '😀😀' = 2 code points, not 4 UTF-16 units
      expect(opts['Total Characters']).toBe('2');
      expect(opts['Unique Characters']).toBe('1');
      expect(opts['😀']).toBe('2');
    });

    it('accepts ::charfrequency as an alias', async () => {
      const boxes = await CharFrequencyBoxSource.generateBoxes('hi', {
        charfrequency: true,
      });
      expect(boxes).toHaveLength(1);
    });

    it('handles "__proto__" input without prototype pollution', async () => {
      const proto = Object.prototype;
      const beforeKeys = Object.getOwnPropertyNames(proto);

      const boxes = await CharFrequencyBoxSource.generateBoxes('__proto__', {
        charfreq: true,
      });

      // must not crash and must return a valid box
      expect(boxes).toHaveLength(1);

      // prototype must be unmodified
      const afterKeys = Object.getOwnPropertyNames(proto);
      expect(afterKeys).toEqual(beforeKeys);

      // '__proto__' = _ _ p r o t o _ _ → 4 underscores, 2 o, 1 each p/r/t
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts._).toBe('4');
      expect(opts.o).toBe('2');
      expect(opts.p).toBe('1');
      expect(opts.r).toBe('1');
      expect(opts.t).toBe('1');
    });

    it('box name is "Character Frequency" and template is KeyValueBoxTemplate', async () => {
      const { KeyValueBoxTemplate } = await import('@components/BoxTemplate');
      const boxes = await CharFrequencyBoxSource.generateBoxes('abc', {
        charfreq: true,
      });
      expect(boxes[0].props.name).toBe('Character Frequency');
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
      expect(boxes[0].props.priority).toBe(10);
    });

    it('sorts by count desc then code point asc', async () => {
      // 'b' x3, 'a' x2, 'c' x1 — after that for ties 'a'(97) before 'c'(99)
      const boxes = await CharFrequencyBoxSource.generateBoxes('bbbaacc', {
        charfreq: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      const keys = Object.keys(opts).filter(
        (k) => !['Total Characters', 'Unique Characters'].includes(k),
      );
      // expected order: b(3), a(2), c(2) — 'a'(97) before 'c'(99) for the tie
      expect(keys).toEqual(['b', 'a', 'c']);
    });
  });

  describe('metadata', () => {
    it('has correct static properties', () => {
      expect(CharFrequencyBoxSource.name).toBe('Character Frequency');
      expect(CharFrequencyBoxSource.tag).toBe('#');
      expect(CharFrequencyBoxSource.kind).toBe('Calculate');
      expect(CharFrequencyBoxSource.priority).toBe(10);
      expect(CharFrequencyBoxSource.defaultInput).toBe(
        'hello world ::charfreq',
      );
    });
  });
});
