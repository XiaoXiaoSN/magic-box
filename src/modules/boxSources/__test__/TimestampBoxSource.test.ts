import { expect, it } from 'vitest';

import { TimestampBoxSource } from '../TimestampBoxSource';

describe('TimestampBoxSource', () => {
  describe('checkMatch', () => {
    it('should return undefined for non-numeric input', () => {
      expect(TimestampBoxSource.checkMatch('not-a-timestamp')).toBeUndefined();
      expect(TimestampBoxSource.checkMatch('abc123')).toBeUndefined();
    });

    it('accepts negative and post-2100 timestamps within the Date range', () => {
      expect(
        TimestampBoxSource.checkMatch('-1000000000')?.date.toISOString(),
      ).toBe('1938-04-24T22:13:20.000Z');
      expect(
        TimestampBoxSource.checkMatch('4102444800000')?.date.toISOString(),
      ).toBe('2100-01-01T00:00:00.000Z');
      expect(
        TimestampBoxSource.checkMatch('9999999999999999999999'),
      ).toBeUndefined();
    });

    it('should handle timestamp in seconds', () => {
      const result = TimestampBoxSource.checkMatch('1704067200');
      expect(result).toBeDefined();
      expect(result?.date.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should handle timestamp in milliseconds', () => {
      const result = TimestampBoxSource.checkMatch('1704067200000');
      expect(result).toBeDefined();
      expect(result?.date.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    });

    it('accepts zero only with an explicit timestamp directive', () => {
      expect(TimestampBoxSource.checkMatch('0')).toBeUndefined();
      expect(TimestampBoxSource.checkMatch('5')).toBeUndefined();
      expect(TimestampBoxSource.checkMatch('+5')).toBeUndefined();
      expect(TimestampBoxSource.checkMatch('1.')).toBeUndefined();
      expect(
        TimestampBoxSource.checkMatch('0', {
          timestamp: true,
        })?.date.toISOString(),
      ).toBe('1970-01-01T00:00:00.000Z');
      expect(
        TimestampBoxSource.checkMatch('+5', { ts: true })?.date.toISOString(),
      ).toBe('1970-01-01T00:00:05.000Z');
    });

    it.each([
      ['1704067200000000', '2024-01-01T00:00:00.000Z'],
      ['1704067200000000000', '2024-01-01T00:00:00.000Z'],
    ])('scales %s by its significant digit count', (input, expected) => {
      expect(TimestampBoxSource.checkMatch(input)?.date.toISOString()).toBe(
        expected,
      );
    });
  });

  describe('generateBoxes', () => {
    it('should return empty array for invalid timestamp', async () => {
      const boxes = await TimestampBoxSource.generateBoxes('invalid-timestamp');
      expect(boxes).toHaveLength(0);
    });

    it('should generate correct boxes for valid timestamp', async () => {
      const boxes = await TimestampBoxSource.generateBoxes('1704067200');
      expect(boxes).toHaveLength(2);

      // RFC 3339 box
      expect(boxes[0].props.name).toBe('RFC 3339');
      expect(boxes[0].props.plaintextOutput).toBe('2024-01-01T00:00:00.000Z');
      expect(boxes[0].boxTemplate).toBeUndefined();

      // RFC 3339 (UTC+8) box
      expect(boxes[1].props.name).toBe('RFC 3339 (UTC+8)');
      expect(boxes[1].props.plaintextOutput).toBe(
        '2024-01-01T08:00:00.000+08:00',
      );
      expect(boxes[1].boxTemplate).toBeUndefined();
    });

    it('should handle millisecond timestamps', async () => {
      const boxes = await TimestampBoxSource.generateBoxes('1704067200000');
      expect(boxes).toHaveLength(2);
      expect(boxes[0].props.plaintextOutput).toBe('2024-01-01T00:00:00.000Z');
      expect(boxes[1].props.plaintextOutput).toBe(
        '2024-01-01T08:00:00.000+08:00',
      );
    });
  });
});
