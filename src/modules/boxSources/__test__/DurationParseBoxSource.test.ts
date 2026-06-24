import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { DurationParseBoxSource } from '../DurationParseBoxSource';

describe('DurationParseBoxSource', () => {
  describe('generateBoxes - no option', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await DurationParseBoxSource.generateBoxes(
        '1h30m20s',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await DurationParseBoxSource.generateBoxes('1h30m20s', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array when unrelated option is set', async () => {
      const boxes = await DurationParseBoxSource.generateBoxes('1h30m20s', {
        hash: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - ::parseduration trigger', () => {
    it('parses 1h30m20s to 5420 total seconds', async () => {
      const boxes = await DurationParseBoxSource.generateBoxes('1h30m20s', {
        parseduration: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.['Total Seconds']).toBe('5420');
    });

    it('parses 2d to 172800 total seconds', async () => {
      const boxes = await DurationParseBoxSource.generateBoxes('2d', {
        parseduration: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.['Total Seconds']).toBe('172800');
    });

    it('parses 90m to 5400 total seconds', async () => {
      const boxes = await DurationParseBoxSource.generateBoxes('90m', {
        parseduration: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.['Total Seconds']).toBe('5400');
    });

    it('parses 1.5h to 5400 total seconds', async () => {
      const boxes = await DurationParseBoxSource.generateBoxes('1.5h', {
        parseduration: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.['Total Seconds']).toBe('5400');
    });

    it('parses 500ms to 0.5 total seconds and 500 total milliseconds', async () => {
      const boxes = await DurationParseBoxSource.generateBoxes('500ms', {
        parseduration: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.['Total Seconds']).toBe('0.5');
      expect(boxes[0].props.options?.['Total Milliseconds']).toBe('500');
    });

    it('parses duration with spaces between segments (1h 30m)', async () => {
      const boxes = await DurationParseBoxSource.generateBoxes('1h 30m', {
        parseduration: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.['Total Seconds']).toBe('5400');
    });
  });

  describe('generateBoxes - ::duration2s trigger', () => {
    it('also triggers on ::duration2s option key', async () => {
      const boxes = await DurationParseBoxSource.generateBoxes('1h30m20s', {
        duration2s: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.['Total Seconds']).toBe('5420');
    });
  });

  describe('generateBoxes - garbage input', () => {
    it('returns empty array for alphabetic garbage "abc"', async () => {
      const boxes = await DurationParseBoxSource.generateBoxes('abc', {
        parseduration: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for unknown unit "1x"', async () => {
      const boxes = await DurationParseBoxSource.generateBoxes('1x', {
        parseduration: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty string', async () => {
      const boxes = await DurationParseBoxSource.generateBoxes('', {
        parseduration: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - output structure', () => {
    it('box name is Parse Duration', async () => {
      const boxes = await DurationParseBoxSource.generateBoxes('1h30m20s', {
        parseduration: true,
      });
      expect(boxes[0].props.name).toBe('Parse Duration');
    });

    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await DurationParseBoxSource.generateBoxes('1h30m20s', {
        parseduration: true,
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('includes Total Milliseconds key for 1h30m20s', async () => {
      const boxes = await DurationParseBoxSource.generateBoxes('1h30m20s', {
        parseduration: true,
      });
      expect(boxes[0].props.options?.['Total Milliseconds']).toBe('5420000');
    });

    it('includes Human key with rebuilt duration for 1h30m20s', async () => {
      const boxes = await DurationParseBoxSource.generateBoxes('1h30m20s', {
        parseduration: true,
      });
      expect(boxes[0].props.options?.Human).toBe('1h 30m 20s');
    });

    it('has correct priority', async () => {
      const boxes = await DurationParseBoxSource.generateBoxes('1h', {
        parseduration: true,
      });
      expect(boxes[0].props.priority).toBe(10);
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(DurationParseBoxSource.name).toBe('Parse Duration');
      expect(DurationParseBoxSource.kind).toBe('Convert');
      expect(typeof DurationParseBoxSource.priority).toBe('number');
    });
  });
});
