import { describe, expect, it } from 'vitest';

import { FrequencyBoxSource } from '../FrequencyBoxSource';

describe('FrequencyBoxSource', () => {
  describe('generateBoxes - no option', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await FrequencyBoxSource.generateBoxes('hello', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await FrequencyBoxSource.generateBoxes('hello', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for unrelated option', async () => {
      const boxes = await FrequencyBoxSource.generateBoxes('hello', {
        hash: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - empty / whitespace input', () => {
    it('returns empty array for empty string', async () => {
      const boxes = await FrequencyBoxSource.generateBoxes('', { freq: true });
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for whitespace-only input', async () => {
      const boxes = await FrequencyBoxSource.generateBoxes('   \t\n', {
        freq: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - ::freq trigger', () => {
    it("counts 'l' twice in 'hello' and places it first", async () => {
      const boxes = await FrequencyBoxSource.generateBoxes('hello', {
        freq: true,
      });
      expect(boxes).toHaveLength(1);
      const firstLine = boxes[0].props.plaintextOutput.split('\n')[0];
      expect(firstLine).toMatch(/^l/);
      expect(firstLine).toContain('2');
    });

    it("counts 'a' three times and 'b' once in 'aaab'", async () => {
      const boxes = await FrequencyBoxSource.generateBoxes('aaab', {
        freq: true,
      });
      expect(boxes).toHaveLength(1);
      const lines = boxes[0].props.plaintextOutput.split('\n');
      expect(lines[0]).toMatch(/^a/);
      expect(lines[0]).toContain('3');
      expect(lines[1]).toMatch(/^b/);
      expect(lines[1]).toContain('1');
    });
  });

  describe('generateBoxes - ::frequency trigger', () => {
    it('also triggers on ::frequency option key', async () => {
      const boxes = await FrequencyBoxSource.generateBoxes('abc', {
        frequency: true,
      });
      expect(boxes).toHaveLength(1);
    });
  });

  describe('generateBoxes - whitespace exclusion', () => {
    it("counts 'a' as 2 and excludes the space in 'a a'", async () => {
      const boxes = await FrequencyBoxSource.generateBoxes('a a', {
        freq: true,
      });
      expect(boxes).toHaveLength(1);
      const lines = boxes[0].props.plaintextOutput.split('\n');
      // only one unique non-whitespace char
      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatch(/^a/);
      expect(lines[0]).toContain('2');
    });
  });

  describe('generateBoxes - astral / multi-codepoint characters', () => {
    it("counts '😀' as one character per occurrence", async () => {
      const boxes = await FrequencyBoxSource.generateBoxes('😀😀', {
        freq: true,
      });
      expect(boxes).toHaveLength(1);
      const lines = boxes[0].props.plaintextOutput.split('\n');
      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatch(/^😀/);
      expect(lines[0]).toContain('2');
    });
  });

  describe('generateBoxes - output format', () => {
    it('includes percent in each row', async () => {
      const boxes = await FrequencyBoxSource.generateBoxes('aa', {
        freq: true,
      });
      expect(boxes[0].props.plaintextOutput).toContain('100.0%');
    });

    it('box name is Frequency', async () => {
      const boxes = await FrequencyBoxSource.generateBoxes('x', { freq: true });
      expect(boxes[0].props.name).toBe('Frequency');
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(FrequencyBoxSource.name).toBe('Frequency');
      expect(FrequencyBoxSource.tag).toBe('#');
      expect(FrequencyBoxSource.kind).toBe('Analyze');
      expect(typeof FrequencyBoxSource.priority).toBe('number');
    });
  });
});
