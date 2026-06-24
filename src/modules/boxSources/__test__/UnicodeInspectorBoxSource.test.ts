import { describe, expect, it } from 'vitest';

import { UnicodeInspectorBoxSource } from '../UnicodeInspectorBoxSource';

describe('UnicodeInspectorBoxSource', () => {
  describe('guard conditions', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await UnicodeInspectorBoxSource.generateBoxes('A', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when options object lacks ::unicode', async () => {
      const boxes = await UnicodeInspectorBoxSource.generateBoxes('A', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input with ::unicode', async () => {
      const boxes = await UnicodeInspectorBoxSource.generateBoxes('', {
        unicode: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for whitespace-only input with ::unicode', async () => {
      const boxes = await UnicodeInspectorBoxSource.generateBoxes('   ', {
        unicode: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('ASCII character — A (U+0041)', () => {
    it('produces one box with a line containing U+0041, dec=65, utf8=41, utf16=0041', async () => {
      const boxes = await UnicodeInspectorBoxSource.generateBoxes('A', {
        unicode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Unicode Inspector');
      const output = boxes[0].props.plaintextOutput;
      expect(output).toContain('U+0041');
      expect(output).toContain('dec=65');
      expect(output).toContain('utf8=41');
      expect(output).toContain('utf16=0041');
    });
  });

  describe('BMP non-ASCII character — € (U+20AC)', () => {
    it('produces a line containing U+20AC and utf8=e2 82 ac', async () => {
      const boxes = await UnicodeInspectorBoxSource.generateBoxes('€', {
        unicode: true,
      });
      expect(boxes).toHaveLength(1);
      const output = boxes[0].props.plaintextOutput;
      expect(output).toContain('U+20AC');
      expect(output).toContain('utf8=e2 82 ac');
    });
  });

  describe('astral plane character — 😀 (U+1F600)', () => {
    it('produces exactly ONE line (surrogate pair treated as single code point)', async () => {
      const boxes = await UnicodeInspectorBoxSource.generateBoxes('😀', {
        unicode: true,
      });
      expect(boxes).toHaveLength(1);
      const lines = boxes[0].props.plaintextOutput.split('\n');
      expect(lines).toHaveLength(1);
    });

    it('line contains U+1F600, dec=128512, utf16=d83d de00, utf8=f0 9f 98 80', async () => {
      const boxes = await UnicodeInspectorBoxSource.generateBoxes('😀', {
        unicode: true,
      });
      const output = boxes[0].props.plaintextOutput;
      expect(output).toContain('U+1F600');
      expect(output).toContain('dec=128512');
      expect(output).toContain('utf16=d83d de00');
      expect(output).toContain('utf8=f0 9f 98 80');
    });
  });

  describe('multi-character string', () => {
    it('a 3-char string yields 3 lines in the output', async () => {
      const boxes = await UnicodeInspectorBoxSource.generateBoxes('A€!', {
        unicode: true,
      });
      expect(boxes).toHaveLength(1);
      const lines = boxes[0].props.plaintextOutput.split('\n');
      expect(lines).toHaveLength(3);
    });
  });
});
