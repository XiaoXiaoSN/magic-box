import { afterEach, describe, expect, it, vi } from 'vitest';
import TimestampBoxSource from '../../modules/boxSources/TimestampBoxSource';
import { getTimezoneOffset, setRuntimePrefs } from '../runtimePrefs';
import {
  formatOffsetSuffix,
  isValidTimezoneOffset,
  toOffsetISOString,
} from '../timezone';

afterEach(() => {
  vi.restoreAllMocks();
  setRuntimePrefs({ timezoneOffset: 8, timezoneMode: 'fixed' });
});

describe('timezone preferences', () => {
  it.each([
    -12, 0, 5.5, 5.75, 8, 12.75, 14,
  ])('accepts fixed offset %s', (offset) => {
    expect(isValidTimezoneOffset(offset)).toBe(true);
  });
  it.each([
    -13,
    15,
    0.1,
    NaN,
    Infinity,
  ])('rejects invalid offset %s', (offset) => {
    expect(isValidTimezoneOffset(offset)).toBe(false);
  });
  it('formats fractional offsets accurately', () => {
    expect(formatOffsetSuffix(5.75)).toBe('+05:45');
    expect(toOffsetISOString(new Date('2026-01-01T00:00:00Z'), -3.5)).toBe(
      '2025-12-31T20:30:00.000-03:30',
    );
  });
  it('reads the system offset at the target date, including DST', async () => {
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockImplementation(function (
      this: Date,
    ) {
      return this.getUTCMonth() === 0 ? 300 : 240;
    });
    setRuntimePrefs({ timezoneOffset: 8, timezoneMode: 'system' });
    const january = new Date('2026-01-01T00:00:00Z');
    const july = new Date('2026-07-01T00:00:00Z');
    expect(getTimezoneOffset(january)).toBe(-5);
    expect(getTimezoneOffset(july)).toBe(-4);
    const januaryBoxes = await TimestampBoxSource.generateBoxes(
      String(january.getTime() / 1000),
    );
    const julyBoxes = await TimestampBoxSource.generateBoxes(
      String(july.getTime() / 1000),
    );
    expect(januaryBoxes[1].props.plaintextOutput).toBe(
      '2025-12-31T19:00:00.000-05:00',
    );
    expect(julyBoxes[1].props.plaintextOutput).toBe(
      '2026-06-30T20:00:00.000-04:00',
    );
    setRuntimePrefs({ timezoneMode: 'fixed', timezoneOffset: 5.75 });
    expect(getTimezoneOffset(july)).toBe(5.75);
  });
});
