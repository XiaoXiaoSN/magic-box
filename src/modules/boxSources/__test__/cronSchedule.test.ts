import { toOffsetISOString } from '@functions/timezone';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isCronExpressionSyntax,
  nextCronOccurrences,
  parseCronSchedule,
} from '../cronSchedule';

const fixedOffset = (offset: number) => (): number => offset;

describe('cron schedule calculation', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('supports named ranges, lists, steps, macros, and seven fields', () => {
    expect(isCronExpressionSyntax('0 15 10 ? JAN,MAR MON-FRI 2025')).toBe(true);
    expect(parseCronSchedule('@annually')?.expression).toBe('0 0 1 1 *');
    expect(
      parseCronSchedule('0 15 10 ? JAN,MAR MON-FRI 2025')?.fieldCount,
    ).toBe(7);
    expect(parseCronSchedule('5/10 * * * *')?.minutes?.values).toEqual([
      5, 15, 25, 35, 45, 55,
    ]);
    expect(parseCronSchedule('0 0 1 * 0-7')?.daysOfWeek?.values).toEqual([
      0, 1, 2, 3, 4, 5, 6,
    ]);
  });

  it.each([
    ['JAN', 1],
    ['FEB', 2],
    ['MAR', 3],
    ['APR', 4],
    ['MAY', 5],
    ['JUN', 6],
    ['JUL', 7],
    ['AUG', 8],
    ['SEP', 9],
    ['OCT', 10],
    ['NOV', 11],
    ['DEC', 12],
  ])('keeps the month alias %s ordinary', (alias, value) => {
    const schedule = parseCronSchedule(`0 0 1 ${alias} *`);

    expect(schedule?.advanced).toBe(false);
    expect(schedule?.months?.values).toEqual([value]);
  });

  it.each([
    ['SUN', 0],
    ['MON', 1],
    ['TUE', 2],
    ['WED', 3],
    ['THU', 4],
    ['FRI', 5],
    ['SAT', 6],
  ])('keeps the weekday alias %s ordinary', (alias, value) => {
    const schedule = parseCronSchedule(`0 0 * * ${alias}`);

    expect(schedule?.advanced).toBe(false);
    expect(schedule?.daysOfWeek?.values).toEqual([value]);
  });

  it('rejects descending ranges except for the wrapping weekday field', () => {
    expect(isCronExpressionSyntax('0 0 1 DEC-FEB,MAR *')).toBe(false);
    expect(parseCronSchedule('0 0 1 DEC-FEB,MAR *')).toBeNull();
    expect(isCronExpressionSyntax('0 22-2 * * *')).toBe(false);
    expect(parseCronSchedule('0 22-2 * * *')).toBeNull();

    const weekdays = parseCronSchedule('0 0 * * FRI-MON');
    expect(weekdays?.daysOfWeek?.values).toEqual([0, 1, 5, 6]);
  });

  it('uses the configured UTC offset without applying it twice', () => {
    const result = nextCronOccurrences(
      '0 9 * * *',
      new Date('2024-01-01T00:00:00Z'),
      fixedOffset(8),
    );

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.occurrences[0].toISOString()).toBe(
      '2024-01-01T01:00:00.000Z',
    );
    expect(toOffsetISOString(result.occurrences[0], 8)).toBe(
      '2024-01-01T09:00:00.000+08:00',
    );
  });

  it('formats quarter-hour fixed offsets', () => {
    const result = nextCronOccurrences(
      '0 0 1 1 *',
      new Date('2023-12-31T00:00:00Z'),
      fixedOffset(5.75),
    );

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(toOffsetISOString(result.occurrences[0], 5.75)).toBe(
      '2024-01-01T00:00:00.000+05:45',
    );
  });

  it('starts strictly after the captured instant, including seconds', () => {
    const result = nextCronOccurrences(
      '*/5 * * * * *',
      new Date('2024-01-01T00:00:05.500Z'),
      fixedOffset(0),
    );

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.occurrences[0].toISOString()).toBe(
      '2024-01-01T00:00:10.000Z',
    );
  });

  it('uses UNIX OR semantics for restricted five-field day fields', () => {
    const result = nextCronOccurrences(
      '0 0 1 * MON',
      new Date('2024-01-02T00:00:00Z'),
      fixedOffset(0),
    );

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(
      result.occurrences.slice(0, 3).map((date) => date.toISOString()),
    ).toEqual([
      '2024-01-08T00:00:00.000Z',
      '2024-01-15T00:00:00.000Z',
      '2024-01-22T00:00:00.000Z',
    ]);
  });

  it('finds leap days across the bounded horizon and rejects impossible dates', () => {
    const leapDays = nextCronOccurrences(
      '0 0 29 2 *',
      new Date('2024-03-01T00:00:00Z'),
      fixedOffset(0),
    );
    const impossible = nextCronOccurrences(
      '0 0 31 2 *',
      new Date('2024-01-01T00:00:00Z'),
      fixedOffset(0),
    );

    expect(leapDays.status).toBe('ok');
    if (leapDays.status === 'ok') {
      expect(leapDays.occurrences.at(-1)?.toISOString()).toBe(
        '2044-02-29T00:00:00.000Z',
      );
      expect(leapDays.checkedCandidates).toBeLessThan(10);
    }
    expect(impossible).toMatchObject({
      status: 'none',
      reason: 'horizon-exhausted',
      occurrences: [],
    });
  });

  it('handles midnight and year boundaries', () => {
    const result = nextCronOccurrences(
      '@midnight',
      new Date('2024-12-31T23:59:59.999Z'),
      fixedOffset(0),
    );

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.occurrences[0].toISOString()).toBe(
      '2025-01-01T00:00:00.000Z',
    );
  });

  it('returns fewer than five occurrences when an explicit year list is exhausted', () => {
    const result = nextCronOccurrences(
      '0 0 0 1 1 * 2025,2027',
      new Date('2024-01-01T00:00:00Z'),
      fixedOffset(0),
    );

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.occurrences.map((date) => date.toISOString())).toEqual([
      '2025-01-01T00:00:00.000Z',
      '2027-01-01T00:00:00.000Z',
    ]);
  });

  it('skips spring DST gaps and keeps both fall-back instants', () => {
    vi.stubEnv('TZ', 'America/New_York');
    const systemOffset = (date: Date): number => -date.getTimezoneOffset() / 60;
    const spring = nextCronOccurrences(
      '30 2 * * *',
      new Date('2024-03-09T00:00:00Z'),
      systemOffset,
    );
    const fall = nextCronOccurrences(
      '30 1 * * *',
      new Date('2024-11-03T00:00:00-04:00'),
      systemOffset,
    );

    expect(spring.status).toBe('ok');
    if (spring.status === 'ok') {
      expect(spring.occurrences[1].toISOString()).toBe(
        '2024-03-11T06:30:00.000Z',
      );
    }
    expect(fall.status).toBe('ok');
    if (fall.status === 'ok') {
      expect(
        fall.occurrences.slice(0, 2).map((date) => date.toISOString()),
      ).toEqual(['2024-11-03T05:30:00.000Z', '2024-11-03T06:30:00.000Z']);
    }
  });

  it('keeps the next five occurrences in absolute order through fall-back', () => {
    vi.stubEnv('TZ', 'America/New_York');
    const systemOffset = (date: Date): number => -date.getTimezoneOffset() / 60;
    const beforeFallback = nextCronOccurrences(
      '* 1 * * *',
      new Date('2024-11-03T04:59:59Z'),
      systemOffset,
    );
    const withinFirstHour = nextCronOccurrences(
      '* 1 * * *',
      new Date('2024-11-03T05:59:59Z'),
      systemOffset,
    );
    const daily = nextCronOccurrences(
      '0 1 * * *',
      new Date('2024-11-03T05:59:59Z'),
      systemOffset,
    );

    expect(beforeFallback.status).toBe('ok');
    if (beforeFallback.status === 'ok') {
      expect(
        beforeFallback.occurrences.map((date) => date.toISOString()),
      ).toEqual([
        '2024-11-03T05:00:00.000Z',
        '2024-11-03T05:01:00.000Z',
        '2024-11-03T05:02:00.000Z',
        '2024-11-03T05:03:00.000Z',
        '2024-11-03T05:04:00.000Z',
      ]);
    }
    expect(withinFirstHour.status).toBe('ok');
    if (withinFirstHour.status === 'ok') {
      expect(
        withinFirstHour.occurrences.map((date) => date.toISOString()),
      ).toEqual([
        '2024-11-03T06:00:00.000Z',
        '2024-11-03T06:01:00.000Z',
        '2024-11-03T06:02:00.000Z',
        '2024-11-03T06:03:00.000Z',
        '2024-11-03T06:04:00.000Z',
      ]);
    }
    expect(daily.status).toBe('ok');
    if (daily.status === 'ok') {
      expect(daily.occurrences.map((date) => date.toISOString())).toEqual([
        '2024-11-03T06:00:00.000Z',
        '2024-11-04T06:00:00.000Z',
        '2024-11-05T06:00:00.000Z',
        '2024-11-06T06:00:00.000Z',
        '2024-11-07T06:00:00.000Z',
      ]);
    }
  });

  it('reports advanced next-time syntax as unavailable without inventing dates', () => {
    const result = nextCronOccurrences(
      '0 0 L * *',
      new Date('2024-01-01T00:00:00Z'),
      fixedOffset(0),
    );

    expect(result).toMatchObject({
      status: 'unavailable',
      reason: 'unsupported-advanced',
      occurrences: [],
    });
  });

  it('keeps high-frequency search bounded', () => {
    const result = nextCronOccurrences(
      '* * * * * *',
      new Date('2024-01-01T00:00:00.000Z'),
      fixedOffset(0),
    );

    expect(result.status).toBe('ok');
    expect(result.checkedCandidates).toBeLessThan(10);
  });
});
