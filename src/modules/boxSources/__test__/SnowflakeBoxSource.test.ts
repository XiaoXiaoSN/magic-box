import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { SnowflakeBoxSource } from '../SnowflakeBoxSource';

describe('SnowflakeBoxSource', () => {
  describe('no ::snowflake option', () => {
    it('returns [] when options are null', async () => {
      const boxes = await SnowflakeBoxSource.generateBoxes(
        '175928847299117063',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when ::snowflake key is absent', async () => {
      const boxes = await SnowflakeBoxSource.generateBoxes(
        '175928847299117063',
        { other: true },
      );
      expect(boxes).toHaveLength(0);
    });
  });

  describe('discord epoch (default)', () => {
    // verified: 175928847299117063n >> 22n = 41944705796n
    // 41944705796 + 1420070400000 = 1462015105796 → 2016-04-30T11:18:25.796Z
    // worker: (id >> 17n) & 0x1fn = 1n, process: (id >> 12n) & 0x1fn = 0n, increment: id & 0xfffn = 7n
    it('parses discord snowflake into correct components', async () => {
      const boxes = await SnowflakeBoxSource.generateBoxes(
        '175928847299117063',
        { snowflake: true },
      );
      expect(boxes).toHaveLength(1);

      const { options } = boxes[0].props;
      expect(options?.Timestamp).toBe('2016-04-30T11:18:25.796Z');
      expect(options?.['Unix (ms)']).toBe('1462015105796');
      expect(options?.['Worker ID']).toBe('1');
      expect(options?.['Process ID']).toBe('0');
      expect(options?.Increment).toBe('7');
      expect(options?.Epoch).toBe('Discord');
    });

    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await SnowflakeBoxSource.generateBoxes(
        '175928847299117063',
        { snowflake: true },
      );
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('sets priority', async () => {
      const boxes = await SnowflakeBoxSource.generateBoxes(
        '175928847299117063',
        { snowflake: true },
      );
      expect(boxes[0].props.priority).toBe(10);
    });
  });

  describe('twitter epoch via ::snowflake=twitter', () => {
    it('reports Epoch as Twitter and returns a plausible date', async () => {
      const boxes = await SnowflakeBoxSource.generateBoxes(
        '1234567890123456789',
        { snowflake: 'twitter' },
      );
      expect(boxes).toHaveLength(1);

      const { options } = boxes[0].props;
      expect(options?.Epoch).toBe('Twitter');

      // plausibility: twitter launched 2006, snowflakes appeared ~2010; date must be after epoch
      const ts = Number(options?.['Unix (ms)']);
      expect(ts).toBeGreaterThan(1288834974657); // after twitter epoch
    });
  });

  describe('invalid input', () => {
    it('returns [] for non-numeric input', async () => {
      const boxes = await SnowflakeBoxSource.generateBoxes('abc', {
        snowflake: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty string', async () => {
      const boxes = await SnowflakeBoxSource.generateBoxes('', {
        snowflake: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for input exceeding max length', async () => {
      const boxes = await SnowflakeBoxSource.generateBoxes(
        '12345678901234567890123456', // 26 digits, over cap
        { snowflake: true },
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for mixed alphanumeric input', async () => {
      const boxes = await SnowflakeBoxSource.generateBoxes('175928abc', {
        snowflake: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('rejects values above the 64-bit range (would crash toISOString)', async () => {
      // 21 digits, > u64 max
      const boxes = await SnowflakeBoxSource.generateBoxes(
        '999999999999999999999',
        { snowflake: true },
      );
      expect(boxes).toHaveLength(0);
    });
  });
});
