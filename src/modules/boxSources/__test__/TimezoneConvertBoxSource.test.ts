import { describe, expect, it } from 'vitest';
import { TimezoneConvertBoxSource } from '../TimezoneConvertBoxSource';

const { generateBoxes } = TimezoneConvertBoxSource;

describe('TimezoneConvertBoxSource', () => {
  it('returns [] when no trigger option is present', async () => {
    const boxes = await generateBoxes('2024-01-01T12:00:00Z', null);
    expect(boxes).toEqual([]);
  });

  it('returns [] when unrelated options are present', async () => {
    const boxes = await generateBoxes('2024-01-01T12:00:00Z', { foo: 'bar' });
    expect(boxes).toEqual([]);
  });

  it('converts UTC input to Asia/Tokyo correctly', async () => {
    const boxes = await generateBoxes('2024-01-01T12:00:00Z', {
      tzconvert: 'Asia/Tokyo',
    });
    expect(boxes).toHaveLength(1);

    const opts = boxes[0].props.options as Record<string, string>;
    // UTC should round-trip unchanged
    expect(opts.UTC).toBe('2024-01-01T12:00:00.000Z');
    // Tokyo is UTC+9, so 12:00 UTC → 21:00 JST on the same calendar date
    expect(opts['Local Time']).toContain('21:00:00');
    expect(opts['Local Time']).toContain('2024-01-01');
    expect(opts.Zone).toBe('Asia/Tokyo');
  });

  it('handles ::intz alias the same way', async () => {
    const boxes = await generateBoxes('2024-01-01T12:00:00Z', {
      intz: 'Asia/Tokyo',
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts['Local Time']).toContain('21:00:00');
  });

  it('converts to UTC zone correctly', async () => {
    const boxes = await generateBoxes('2024-06-15T00:00:00Z', {
      tzconvert: 'UTC',
    });
    expect(boxes).toHaveLength(1);

    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts['Local Time']).toContain('2024-06-15');
    expect(opts['Local Time']).toContain('00:00:00');
  });

  it('returns an error box for an invalid IANA zone', async () => {
    const boxes = await generateBoxes('2024-01-01T00:00:00Z', {
      tzconvert: 'Not/AZone',
    });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.plaintextOutput).toMatch(/not a valid.*timezone/i);
  });

  it('returns an error box for an unparseable date string', async () => {
    const boxes = await generateBoxes('notadate', { tzconvert: 'UTC' });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.plaintextOutput).toMatch(/not a valid date/i);
  });

  it('returns an error box when zone value is missing (bare flag)', async () => {
    // hasOptionKeys returns true for boolean true values, but getZone returns null
    const boxes = await generateBoxes('2024-01-01T12:00:00Z', {
      tzconvert: true,
    });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.plaintextOutput).toMatch(/required/i);
  });

  it('returns an error box when zone is an empty string', async () => {
    const boxes = await generateBoxes('2024-01-01T12:00:00Z', {
      tzconvert: '',
    });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.plaintextOutput).toMatch(/required/i);
  });

  it('treats empty input string as "now" and returns a result', async () => {
    const boxes = await generateBoxes('', { tzconvert: 'UTC' });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Zone).toBe('UTC');
    // just verify it produced a date-like string
    expect(opts['Local Time']).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it('treats "now" (case-insensitive) as current time', async () => {
    const boxes = await generateBoxes('NOW', { tzconvert: 'UTC' });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts['Local Time']).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it('includes Offset in the output options', async () => {
    const boxes = await generateBoxes('2024-01-01T12:00:00Z', {
      tzconvert: 'Asia/Tokyo',
    });
    const opts = boxes[0].props.options as Record<string, string>;
    // Tokyo offset is GMT+9
    expect(opts.Offset).toContain('+9');
  });
});
