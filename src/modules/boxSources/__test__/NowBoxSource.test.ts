import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { expect, vi } from 'vitest';

import { NowBoxSource } from '../NowBoxSource';

describe('NowBoxSource', () => {
  describe('checkMatch', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return undefined for non-"now" input', () => {
      expect(NowBoxSource.checkMatch('not now')).toBeUndefined();
      expect(NowBoxSource.checkMatch('ha-ha-ball')).toBeUndefined();
    });

    it('should match "now" input case-insensitively', () => {
      const expectResult = {
        date: new Date('2024-01-01T00:00:00Z'),
        timestamp: 1704067200000,
        twDate: new Date('2024-01-01T08:00:00Z'),
      };

      expect(NowBoxSource.checkMatch('now')).toStrictEqual(expectResult);
      expect(NowBoxSource.checkMatch('NOW')).toStrictEqual(expectResult);
      expect(NowBoxSource.checkMatch('Now')).toStrictEqual(expectResult);
    });

    it('should return correct timestamp and dates', () => {
      const result = NowBoxSource.checkMatch('now');
      expect(result).toBeDefined();
      expect(result?.timestamp).toBe(1704067200000); // 2024-01-01T00:00:00Z in milliseconds
      expect(result?.date.toISOString()).toBe('2024-01-01T00:00:00.000Z');
      expect(result?.twDate.toISOString()).toBe('2024-01-01T08:00:00.000Z');
    });
  });

  describe('generateBoxes', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return empty array for non-matching input', async () => {
      const boxes = await NowBoxSource.generateBoxes('not now');
      expect(boxes).toHaveLength(0);
    });

    it('should generate correct boxes for "now"', async () => {
      const boxes = await NowBoxSource.generateBoxes('now');
      expect(boxes).toHaveLength(3);

      // RFC 3339 box
      expect(boxes[0].props.name).toBe('RFC 3339');
      expect(boxes[0].props.plaintextOutput).toBe('2024-01-01T00:00:00.000Z');
      expect(boxes[0].component).toBe(DefaultBoxTemplate);

      // RFC 3339 (UTC+8) box
      expect(boxes[1].props.name).toBe('RFC 3339 (UTC+8)');
      expect(boxes[1].props.plaintextOutput).toBe('2024-01-01T08:00:00.000+08:00');
      expect(boxes[1].component).toBe(DefaultBoxTemplate);

      // Timestamp box
      expect(boxes[2].props.name).toBe('Timestamp (s)');
      expect(boxes[2].props.plaintextOutput).toBe('1704067200');
      expect(boxes[2].component).toBe(DefaultBoxTemplate);
    });
  });
});
