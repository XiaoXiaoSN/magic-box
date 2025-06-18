import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { expect } from 'vitest';

import { TimeFormatBoxSource } from '../TimeFormatBoxSource';

describe('TimeFormatBoxSource', () => {
  describe('checkMatch', () => {
    it('should return undefined for empty input', () => {
      expect(TimeFormatBoxSource.checkMatch('')).toBeUndefined();
    });

    it('should return undefined for invalid RFC3339 format', () => {
      expect(TimeFormatBoxSource.checkMatch('invalid-time')).toBeUndefined();
      expect(TimeFormatBoxSource.checkMatch('2024-13-45')).toBeUndefined();
    });

    it('should parse valid RFC3339 time string', () => {
      const result = TimeFormatBoxSource.checkMatch('2024-12-15T19:34:57.530+08:00');
      expect(result).toBeDefined();
      expect(result?.timestamp).toBe(1734262497530);
    });

    it('should handle UTC time string', () => {
      const result = TimeFormatBoxSource.checkMatch('2024-01-01T00:00:00Z');
      expect(result).toBeDefined();
      expect(result?.timestamp).toBe(1704067200000);
    });
  });

  describe('generateBoxes', () => {
    it('should return empty array for invalid time string', async () => {
      const boxes = await TimeFormatBoxSource.generateBoxes('invalid-time');
      expect(boxes).toHaveLength(0);
    });

    it('should generate correct boxes for valid time string', async () => {
      const boxes = await TimeFormatBoxSource.generateBoxes('2024-12-15T19:34:57.530+08:00');
      expect(boxes).toHaveLength(2);

      // timestamp (s) box
      expect(boxes[0].props.name).toBe('timestamp (s)');
      expect(boxes[0].props.plaintextOutput).toBe('1734262497.53');
      expect(boxes[0].props.priority).toBe(10);
      expect(boxes[0].component).toBe(DefaultBoxTemplate);

      // timestamp (ms) box
      expect(boxes[1].props.name).toBe('timestamp (ms)');
      expect(boxes[1].props.plaintextOutput).toBe('1734262497530');
      expect(boxes[1].props.priority).toBe(10);
      expect(boxes[1].component).toBe(DefaultBoxTemplate);
    });
  });
});
