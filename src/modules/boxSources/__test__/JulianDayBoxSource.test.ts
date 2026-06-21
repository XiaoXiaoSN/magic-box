import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';
import { JulianDayBoxSource } from '../JulianDayBoxSource';

describe('JulianDayBoxSource', () => {
  describe('generateBoxes — option gate', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await JulianDayBoxSource.generateBoxes('2000-01-01', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for an unrelated option', async () => {
      const boxes = await JulianDayBoxSource.generateBoxes('2000-01-01', {
        base64: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes — date → JDN (::julianday)', () => {
    it('converts 2000-01-01 to JDN 2451545 (J2000 epoch)', async () => {
      const boxes = await JulianDayBoxSource.generateBoxes('2000-01-01', {
        julianday: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        'Julian Day Number': '2451545',
      });
    });

    it('converts 1970-01-01 to JDN 2440588 (Unix epoch)', async () => {
      const boxes = await JulianDayBoxSource.generateBoxes('1970-01-01', {
        julianday: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        'Julian Day Number': '2440588',
      });
    });

    it('converts -4713-11-24 to JDN 0 (epoch of the JDN calendar)', async () => {
      const boxes = await JulianDayBoxSource.generateBoxes('-4713-11-24', {
        julianday: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        'Julian Day Number': '0',
      });
    });

    it('reports Saturday for 2000-01-01', async () => {
      const boxes = await JulianDayBoxSource.generateBoxes('2000-01-01', {
        julianday: true,
      });
      expect(boxes[0].props.options).toMatchObject({
        'Day of Week': 'Saturday',
      });
    });

    it('includes the input date in the output', async () => {
      const boxes = await JulianDayBoxSource.generateBoxes('2000-01-01', {
        julianday: true,
      });
      expect(boxes[0].props.options).toMatchObject({ Date: '2000-01-01' });
    });

    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await JulianDayBoxSource.generateBoxes('2000-01-01', {
        julianday: true,
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('sets correct priority', async () => {
      const boxes = await JulianDayBoxSource.generateBoxes('2000-01-01', {
        julianday: true,
      });
      expect(boxes[0].props.priority).toBe(10);
    });
  });

  describe('generateBoxes — date → JDN (::jdn alias)', () => {
    it('accepts ::jdn option', async () => {
      const boxes = await JulianDayBoxSource.generateBoxes('2000-01-01', {
        jdn: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        'Julian Day Number': '2451545',
      });
    });
  });

  describe('generateBoxes — JDN → date (reverse)', () => {
    it('converts JDN 2451545 back to 2000-01-01', async () => {
      const boxes = await JulianDayBoxSource.generateBoxes('2451545', {
        julianday: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({ Date: '2000-01-01' });
    });

    it('converts JDN 2440588 back to 1970-01-01', async () => {
      const boxes = await JulianDayBoxSource.generateBoxes('2440588', {
        julianday: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({ Date: '1970-01-01' });
    });

    it('JDN 2451545 round-trip preserves JDN in output', async () => {
      const boxes = await JulianDayBoxSource.generateBoxes('2451545', {
        julianday: true,
      });
      expect(boxes[0].props.options).toMatchObject({
        'Julian Day Number': '2451545',
      });
    });

    it('JDN 0 round-trip returns -4713-11-24', async () => {
      const boxes = await JulianDayBoxSource.generateBoxes('0', {
        julianday: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({ Date: '-4713-11-24' });
    });

    it('JDN 2451545 day of week is Saturday', async () => {
      const boxes = await JulianDayBoxSource.generateBoxes('2451545', {
        julianday: true,
      });
      expect(boxes[0].props.options).toMatchObject({
        'Day of Week': 'Saturday',
      });
    });
  });

  describe('generateBoxes — invalid input', () => {
    it('returns a box with an error for unrecognised text "hello"', async () => {
      const boxes = await JulianDayBoxSource.generateBoxes('hello', {
        julianday: true,
      });
      expect(boxes).toHaveLength(1);
      // the error box should mention the expected format
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Date format'] ?? opts.Error).toBeTruthy();
    });

    it('returns [] for empty input', async () => {
      const boxes = await JulianDayBoxSource.generateBoxes('', {
        julianday: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for input longer than 40 chars', async () => {
      const boxes = await JulianDayBoxSource.generateBoxes(
        '2000-01-01-extra-padding-that-is-way-too-long',
        { julianday: true },
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns an error box for out-of-range month', async () => {
      const boxes = await JulianDayBoxSource.generateBoxes('2000-13-01', {
        julianday: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toBeTruthy();
    });
  });

  describe('source metadata', () => {
    it('has the correct name', () => {
      expect(JulianDayBoxSource.name).toBe('Julian Day');
    });

    it('has a non-empty description', () => {
      expect(JulianDayBoxSource.description.length).toBeGreaterThan(0);
    });

    it('has defaultInput containing ::julianday', () => {
      expect(JulianDayBoxSource.defaultInput).toContain('::julianday');
    });
  });
});
