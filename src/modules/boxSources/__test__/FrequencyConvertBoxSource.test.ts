import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { FrequencyConvertBoxSource } from '../FrequencyConvertBoxSource';

describe('FrequencyConvertBoxSource', () => {
  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(FrequencyConvertBoxSource.name).toBe('Frequency Convert');
      expect(FrequencyConvertBoxSource.tag).toBe('#');
      expect(FrequencyConvertBoxSource.kind).toBe('Convert');
      expect(FrequencyConvertBoxSource.priority).toBe(10);
    });
  });

  describe('option gate', () => {
    it('returns [] when options is null', async () => {
      const boxes = await FrequencyConvertBoxSource.generateBoxes(
        '2.4 GHz',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty options object', async () => {
      const boxes = await FrequencyConvertBoxSource.generateBoxes(
        '2.4 GHz',
        {},
      );
      expect(boxes).toHaveLength(0);
    });

    it('activates on ::frequency option', async () => {
      const boxes = await FrequencyConvertBoxSource.generateBoxes('2.4 GHz', {
        frequency: true,
      });
      expect(boxes).toHaveLength(1);
    });

    it('activates on ::freq option', async () => {
      const boxes = await FrequencyConvertBoxSource.generateBoxes('2.4 GHz', {
        freq: true,
      });
      expect(boxes).toHaveLength(1);
    });
  });

  describe('2.4 GHz → Hz / MHz / GHz', () => {
    it('Hz is 2400000000', async () => {
      const boxes = await FrequencyConvertBoxSource.generateBoxes('2.4 GHz', {
        frequency: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      // 2.4 GHz = 2.4e9 Hz exactly
      expect(Number.parseFloat(kv.Hz)).toBe(2_400_000_000);
    });

    it('MHz is 2400', async () => {
      const boxes = await FrequencyConvertBoxSource.generateBoxes('2.4 GHz', {
        frequency: true,
      });
      const kv = boxes[0].props.options as Record<string, string>;
      // 2.4 GHz = 2400 MHz
      expect(Number.parseFloat(kv.MHz)).toBe(2400);
    });

    it('GHz is 2.4', async () => {
      const boxes = await FrequencyConvertBoxSource.generateBoxes('2.4 GHz', {
        frequency: true,
      });
      const kv = boxes[0].props.options as Record<string, string>;
      expect(Number.parseFloat(kv.GHz)).toBeCloseTo(2.4, 9);
    });

    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await FrequencyConvertBoxSource.generateBoxes('2.4 GHz', {
        frequency: true,
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('box name is Frequency Convert', async () => {
      const boxes = await FrequencyConvertBoxSource.generateBoxes('2.4 GHz', {
        frequency: true,
      });
      expect(boxes[0].props.name).toBe('Frequency Convert');
    });

    it('priority is set to 10', async () => {
      const boxes = await FrequencyConvertBoxSource.generateBoxes('2.4 GHz', {
        frequency: true,
      });
      expect(boxes[0].props.priority).toBe(10);
    });

    it('kv options contain all expected keys', async () => {
      const boxes = await FrequencyConvertBoxSource.generateBoxes('2.4 GHz', {
        frequency: true,
      });
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv).toHaveProperty('Input');
      expect(kv).toHaveProperty('Hz');
      expect(kv).toHaveProperty('kHz');
      expect(kv).toHaveProperty('MHz');
      expect(kv).toHaveProperty('GHz');
      expect(kv).toHaveProperty('THz');
      expect(kv).toHaveProperty('Period');
    });
  });

  describe('1 kHz → Hz / Period', () => {
    it('Hz is 1000', async () => {
      const boxes = await FrequencyConvertBoxSource.generateBoxes('1 kHz', {
        frequency: true,
      });
      const kv = boxes[0].props.options as Record<string, string>;
      expect(Number.parseFloat(kv.Hz)).toBe(1000);
    });

    it('Period is approximately 0.001 s (1 ms)', async () => {
      const boxes = await FrequencyConvertBoxSource.generateBoxes('1 kHz', {
        frequency: true,
      });
      const kv = boxes[0].props.options as Record<string, string>;
      // period should contain "0.001 s"
      const periodVal = Number.parseFloat(kv.Period);
      expect(periodVal).toBeCloseTo(0.001, 9);
    });
  });

  describe('1 Hz', () => {
    it('Period is 1 s', async () => {
      const boxes = await FrequencyConvertBoxSource.generateBoxes('1 Hz', {
        frequency: true,
      });
      const kv = boxes[0].props.options as Record<string, string>;
      const periodVal = Number.parseFloat(kv.Period);
      expect(periodVal).toBe(1);
    });

    it('Hz is 1', async () => {
      const boxes = await FrequencyConvertBoxSource.generateBoxes('1 Hz', {
        frequency: true,
      });
      const kv = boxes[0].props.options as Record<string, string>;
      expect(Number.parseFloat(kv.Hz)).toBe(1);
    });
  });

  describe('440 Hz', () => {
    it('kHz is 0.44', async () => {
      const boxes = await FrequencyConvertBoxSource.generateBoxes('440 Hz', {
        frequency: true,
      });
      const kv = boxes[0].props.options as Record<string, string>;
      expect(Number.parseFloat(kv.kHz)).toBeCloseTo(0.44, 9);
    });
  });

  describe('1000000 Hz', () => {
    it('MHz is 1', async () => {
      const boxes = await FrequencyConvertBoxSource.generateBoxes(
        '1000000 Hz',
        {
          frequency: true,
        },
      );
      const kv = boxes[0].props.options as Record<string, string>;
      expect(Number.parseFloat(kv.MHz)).toBe(1);
    });

    it('kHz is 1000', async () => {
      const boxes = await FrequencyConvertBoxSource.generateBoxes(
        '1000000 Hz',
        {
          frequency: true,
        },
      );
      const kv = boxes[0].props.options as Record<string, string>;
      expect(Number.parseFloat(kv.kHz)).toBe(1000);
    });
  });

  describe('invalid inputs', () => {
    it('returns an error box for "abc"', async () => {
      const boxes = await FrequencyConvertBoxSource.generateBoxes('abc', {
        frequency: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/invalid input/i);
    });

    it('returns an error box for "5 foo" (unknown unit)', async () => {
      const boxes = await FrequencyConvertBoxSource.generateBoxes('5 foo', {
        frequency: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/invalid input/i);
    });

    it('returns an error box for input exceeding 64 chars', async () => {
      const long = `${'1'.repeat(70)} GHz`;
      const boxes = await FrequencyConvertBoxSource.generateBoxes(long, {
        frequency: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/invalid input/i);
    });
  });

  describe('plaintext output', () => {
    it('plaintextOutput contains key: value lines', async () => {
      const boxes = await FrequencyConvertBoxSource.generateBoxes('2.4 GHz', {
        frequency: true,
      });
      const text = boxes[0].props.plaintextOutput;
      expect(text).toMatch(/Hz:/);
      expect(text).toMatch(/MHz:/);
      expect(text).toMatch(/GHz:/);
      expect(text).toMatch(/Period:/);
    });
  });

  describe('case-insensitive unit parsing', () => {
    it('accepts "ghz" lowercase', async () => {
      const boxes = await FrequencyConvertBoxSource.generateBoxes('1 ghz', {
        frequency: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(Number.parseFloat(kv.Hz)).toBe(1e9);
    });

    it('accepts "MHZ" uppercase', async () => {
      const boxes = await FrequencyConvertBoxSource.generateBoxes('100 MHZ', {
        frequency: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(Number.parseFloat(kv.Hz)).toBe(1e8);
    });
  });
});
