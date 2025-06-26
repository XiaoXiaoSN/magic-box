import { expect } from 'vitest';

import { DefaultBoxTemplate } from '@components/BoxTemplate';

import { TimestampBoxSource } from '../TimestampBoxSource';

describe('TimestampBoxSource', () => {
  describe('checkMatch', () => {
    it('should return undefined for non-numeric input', () => {
      expect(TimestampBoxSource.checkMatch('not-a-timestamp')).toBeUndefined();
      expect(TimestampBoxSource.checkMatch('abc123')).toBeUndefined();
    });

    it('should return undefined for timestamps out of range', () => {
      // Before 1600
      expect(TimestampBoxSource.checkMatch('-1000000000')).toBeUndefined();
      // After 2100
      expect(TimestampBoxSource.checkMatch('4102444800000')).toBeUndefined();
    });

    it('should handle timestamp in seconds', () => {
      const result = TimestampBoxSource.checkMatch('1704067200');
      expect(result).toBeDefined();
      expect(result?.date.toISOString()).toBe('2024-01-01T00:00:00.000Z');
      expect(result?.twDate.toISOString()).toBe('2024-01-01T08:00:00.000Z');
    });

    it('should handle timestamp in milliseconds', () => {
      const result = TimestampBoxSource.checkMatch('1704067200000');
      expect(result).toBeDefined();
      expect(result?.date.toISOString()).toBe('2024-01-01T00:00:00.000Z');
      expect(result?.twDate.toISOString()).toBe('2024-01-01T08:00:00.000Z');
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
      expect(boxes[0].props.priority).toBe(9);
      expect(boxes[0].component).toBe(DefaultBoxTemplate);

      // RFC 3339 (UTC+8) box
      expect(boxes[1].props.name).toBe('RFC 3339 (UTC+8)');
      expect(boxes[1].props.plaintextOutput).toBe('2024-01-01T08:00:00.000Z');
      expect(boxes[1].props.priority).toBe(9);
      expect(boxes[1].component).toBe(DefaultBoxTemplate);
    });

    it('should handle millisecond timestamps', async () => {
      const boxes = await TimestampBoxSource.generateBoxes('1704067200000');
      expect(boxes).toHaveLength(2);
      expect(boxes[0].props.plaintextOutput).toBe('2024-01-01T00:00:00.000Z');
      expect(boxes[1].props.plaintextOutput).toBe('2024-01-01T08:00:00.000Z');
    });
  });
});
