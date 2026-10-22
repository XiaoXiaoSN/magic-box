const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MAX_YEAR_SPAN = 20;
const MAX_WALL_CANDIDATES = 250_000;

const MONTH_NAMES: Readonly<Record<string, number>> = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
};

const DAY_NAMES: Readonly<Record<string, number>> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
};

const CRON_MACROS: Readonly<Record<string, string>> = {
  yearly: '0 0 1 1 *',
  annually: '0 0 1 1 *',
  monthly: '0 0 1 * *',
  weekly: '0 0 * * 0',
  daily: '0 0 * * *',
  midnight: '0 0 * * *',
  hourly: '0 * * * *',
};

type FieldKind =
  | 'second'
  | 'minute'
  | 'hour'
  | 'dayOfMonth'
  | 'month'
  | 'dayOfWeek'
  | 'year';

interface CronField {
  values: readonly number[];
  wildcard: boolean;
}

export interface ParsedCronSchedule {
  expression: string;
  fieldCount: 5 | 6 | 7;
  advanced: boolean;
  seconds: CronField | null;
  minutes: CronField | null;
  hours: CronField | null;
  daysOfMonth: CronField | null;
  months: CronField | null;
  daysOfWeek: CronField | null;
  years: CronField | null;
}

export type NextCronResult =
  | {
      status: 'ok';
      occurrences: readonly Date[];
      checkedCandidates: number;
    }
  | {
      status: 'none' | 'unavailable';
      occurrences: readonly [];
      checkedCandidates: number;
      reason:
        | 'horizon-exhausted'
        | 'search-budget-exceeded'
        | 'unsupported-advanced'
        | 'invalid';
    };

export type TimezoneOffsetResolver = (date: Date) => number;

interface WallParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const isInteger = (value: string): boolean => /^\d+$/.test(value);

const valuesForRange = (
  start: number,
  end: number,
  step: number,
  kind: FieldKind,
): number[] => {
  const values: number[] = [];
  if (kind !== 'dayOfWeek') {
    for (let value = start; value <= end; value += step) values.push(value);
    return values;
  }

  const span = end >= start ? end - start : end + 7 - start;
  for (let index = 0; index <= span; index += step) {
    values.push((start + index) % 7);
  }
  return values;
};

const fieldBounds = (kind: FieldKind): readonly [number, number] => {
  if (kind === 'dayOfMonth') return [1, 31];
  if (kind === 'month') return [1, 12];
  if (kind === 'year') return [1900, 9999];
  if (kind === 'hour') return [0, 23];
  return [0, kind === 'dayOfWeek' ? 6 : 59];
};

function valueForToken(token: string, kind: FieldKind): number | null {
  const upper = token.toUpperCase();
  const named =
    kind === 'month' ? MONTH_NAMES : kind === 'dayOfWeek' ? DAY_NAMES : null;
  if (named !== null && Object.hasOwn(named, upper)) return named[upper];
  if (!isInteger(token)) return null;

  const value = Number(token);
  if (kind === 'dayOfWeek') return value >= 0 && value <= 7 ? value % 7 : null;
  if (kind === 'year') return value >= 1900 && value <= 9999 ? value : null;

  const ranges: Readonly<
    Record<Exclude<FieldKind, 'dayOfWeek' | 'year'>, readonly [number, number]>
  > = {
    second: [0, 59],
    minute: [0, 59],
    hour: [0, 23],
    dayOfMonth: [1, 31],
    month: [1, 12],
  };
  const range = ranges[kind];
  return value >= range[0] && value <= range[1] ? value : null;
}

function parseField(input: string, kind: FieldKind): CronField | null {
  if (input === '?' && kind !== 'dayOfMonth' && kind !== 'dayOfWeek')
    return null;
  if (input.includes('?') && input !== '?') return null;
  if (hasAdvancedMarkers(input, kind)) return null;

  const values = new Set<number>();
  const pieces = input.split(',');
  if (pieces.some((piece) => piece === '')) return null;

  for (const piece of pieces) {
    const slash = piece.indexOf('/');
    if (slash !== piece.lastIndexOf('/')) return null;

    const base = slash === -1 ? piece : piece.slice(0, slash);
    const stepText = slash === -1 ? null : piece.slice(slash + 1);
    const step = stepText === null ? 1 : Number(stepText);
    if (!Number.isInteger(step) || step <= 0) return null;

    if (base === '*' || base === '?') {
      if (base === '?' && input !== '?') return null;
      const [min, max] = fieldBounds(kind);
      for (const value of valuesForRange(min, max, step, kind))
        values.add(value);
      continue;
    }

    const hyphen = base.indexOf('-');
    if (hyphen !== -1) {
      if (hyphen !== base.lastIndexOf('-')) return null;
      const start = valueForToken(base.slice(0, hyphen), kind);
      const end = valueForToken(base.slice(hyphen + 1), kind);
      if (start === null || end === null) return null;
      if (kind !== 'dayOfWeek' && start > end) return null;
      if (
        kind === 'dayOfWeek' &&
        base.slice(0, hyphen) === '0' &&
        base.slice(hyphen + 1) === '7'
      ) {
        for (const value of valuesForRange(0, 6, step, kind)) values.add(value);
        continue;
      }
      for (const value of valuesForRange(start, end, step, kind))
        values.add(value);
      continue;
    }

    const value = valueForToken(base, kind);
    if (value === null) return null;
    if (slash === -1) {
      values.add(value);
    } else {
      const [, max] = fieldBounds(kind);
      for (const steppedValue of valuesForRange(value, max, step, kind))
        values.add(steppedValue);
    }
  }

  return {
    values: [...values].sort((left, right) => left - right),
    wildcard: input === '*' || input === '?',
  };
}

const isOrdinaryDescriptionToken = (
  value: string,
  kind: FieldKind,
): boolean => {
  if (value === '*' || value === '?') return true;
  return valueForToken(value, kind) !== null;
};

const isAdvancedDescriptionToken = (
  value: string,
  kind: FieldKind,
): boolean => {
  const upper = value.toUpperCase();
  if (upper === 'L' && (kind === 'dayOfMonth' || kind === 'dayOfWeek'))
    return true;
  if (kind === 'dayOfMonth') {
    if (upper === 'W' || upper === 'LW') return true;
    if (upper.endsWith('W') && valueForToken(upper.slice(0, -1), kind) !== null)
      return true;
  }
  if (
    (kind === 'dayOfMonth' || kind === 'dayOfWeek') &&
    upper.endsWith('L') &&
    valueForToken(upper.slice(0, -1), kind) !== null
  )
    return true;
  return false;
};

const hasAdvancedMarkers = (input: string, kind: FieldKind): boolean => {
  for (const commaPiece of input.split(',')) {
    const slash = commaPiece.indexOf('/');
    const base = slash === -1 ? commaPiece : commaPiece.slice(0, slash);
    const hash = base.indexOf('#');
    if (hash !== -1) {
      if (kind === 'dayOfWeek') return true;
      continue;
    }
    const rangeParts = base.split('-');
    if (rangeParts.some((part) => isAdvancedDescriptionToken(part, kind)))
      return true;
  }
  return false;
};

function validateDescriptionField(input: string, kind: FieldKind): boolean {
  if (input === '?') return kind === 'dayOfMonth' || kind === 'dayOfWeek';
  if (input.includes('?')) return false;
  if (!/^[0-9A-Za-z*?,/#LW-]+$/i.test(input)) return false;

  for (const commaPiece of input.split(',')) {
    if (commaPiece === '') return false;
    const hashParts = commaPiece.split('#');
    if (
      hashParts.length > 2 ||
      (hashParts.length === 2 && kind !== 'dayOfWeek')
    )
      return false;
    if (
      hashParts.length === 2 &&
      (!isInteger(hashParts[1]) ||
        Number(hashParts[1]) < 1 ||
        Number(hashParts[1]) > 5)
    )
      return false;
    if (
      hashParts.length === 2 &&
      !isOrdinaryDescriptionToken(hashParts[0], kind)
    )
      return false;

    const stepped = hashParts[0];
    const slashParts = stepped.split('/');
    if (
      slashParts.length > 2 ||
      (slashParts.length === 2 &&
        (!isInteger(slashParts[1]) || Number(slashParts[1]) < 1))
    )
      return false;
    const base = slashParts[0];
    const rangeParts = base.split('-');
    if (rangeParts.length > 2) return false;
    if (rangeParts.length === 2 && kind !== 'dayOfWeek') {
      const start = valueForToken(rangeParts[0], kind);
      const end = valueForToken(rangeParts[1], kind);
      if (start !== null && end !== null && start > end) return false;
    }

    for (const rangePart of rangeParts) {
      if (
        !isOrdinaryDescriptionToken(rangePart, kind) &&
        !isAdvancedDescriptionToken(rangePart, kind)
      )
        return false;
    }
  }
  return true;
}

export const normalizeCronExpression = (input: string): string | null => {
  const trimmed = input.trim();
  if (trimmed.startsWith('@'))
    return CRON_MACROS[trimmed.slice(1).toLowerCase()] ?? null;
  return trimmed;
};

export const isCronExpressionSyntax = (input: string): boolean => {
  const normalized = normalizeCronExpression(input);
  if (normalized === null || normalized === '') return false;
  const fields = normalized.split(/\s+/);
  if (fields.length < 5 || fields.length > 7) return false;

  const kinds: readonly FieldKind[] =
    fields.length === 5
      ? ['minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek']
      : fields.length === 6
        ? ['second', 'minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek']
        : [
            'second',
            'minute',
            'hour',
            'dayOfMonth',
            'month',
            'dayOfWeek',
            'year',
          ];
  return fields.every((field, index) =>
    validateDescriptionField(field, kinds[index]),
  );
};

export const parseCronSchedule = (input: string): ParsedCronSchedule | null => {
  const normalized = normalizeCronExpression(input);
  if (normalized === null || !isCronExpressionSyntax(input)) return null;
  const fields = normalized.split(/\s+/);
  const fieldCount = fields.length as 5 | 6 | 7;
  const kinds: readonly FieldKind[] =
    fieldCount === 5
      ? ['minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek']
      : fieldCount === 6
        ? ['second', 'minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek']
        : [
            'second',
            'minute',
            'hour',
            'dayOfMonth',
            'month',
            'dayOfWeek',
            'year',
          ];
  const advanced = fields.some((field, index) =>
    hasAdvancedMarkers(field, kinds[index]),
  );
  if (advanced) {
    return {
      expression: normalized,
      fieldCount,
      advanced: true,
      seconds: null,
      minutes: null,
      hours: null,
      daysOfMonth: null,
      months: null,
      daysOfWeek: null,
      years: null,
    };
  }

  const offset = fieldCount === 5 ? 0 : 1;
  const seconds =
    fieldCount === 5
      ? parseField('0', 'second')
      : parseField(fields[0], 'second');
  const minutes = parseField(fields[offset], 'minute');
  const hours = parseField(fields[offset + 1], 'hour');
  const daysOfMonth = parseField(fields[offset + 2], 'dayOfMonth');
  const months = parseField(fields[offset + 3], 'month');
  const daysOfWeek = parseField(fields[offset + 4], 'dayOfWeek');
  const years = fieldCount === 7 ? parseField(fields[6], 'year') : null;
  if (
    seconds === null ||
    minutes === null ||
    hours === null ||
    daysOfMonth === null ||
    months === null ||
    daysOfWeek === null ||
    (fieldCount === 7 && years === null)
  )
    return null;

  return {
    expression: normalized,
    fieldCount,
    advanced: false,
    seconds,
    minutes,
    hours,
    daysOfMonth,
    months,
    daysOfWeek,
    years,
  };
};

const daysInMonth = (year: number, month: number): number => {
  if (month === 2)
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28;
  return [31, 0, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
};

const partsFromShiftedDate = (date: Date, offsetHours: number): WallParts => {
  const shifted = new Date(date.getTime() + offsetHours * HOUR_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
  };
};

const sameWallParts = (left: WallParts, right: WallParts): boolean =>
  left.year === right.year &&
  left.month === right.month &&
  left.day === right.day &&
  left.hour === right.hour &&
  left.minute === right.minute &&
  left.second === right.second;

const wallAsUtc = (parts: WallParts): number =>
  Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

const offsetsForWallDate = (
  wallTimestamp: number,
  getTimezoneOffset: TimezoneOffsetResolver,
): readonly number[] => {
  const offsets = new Set<number>();
  for (const delta of [-7 * DAY_MS, -DAY_MS, 0, DAY_MS, 7 * DAY_MS]) {
    const offset = getTimezoneOffset(new Date(wallTimestamp + delta));
    if (Number.isFinite(offset)) offsets.add(offset);
  }
  return [...offsets];
};

const firstInstantWithOffset = (
  wallTimestamp: number,
  offset: number,
  getTimezoneOffset: TimezoneOffsetResolver,
): number | null => {
  const start = wallTimestamp - offset * HOUR_MS;
  const end = start + DAY_MS;
  if (getTimezoneOffset(new Date(start)) === offset) return start;

  let previous = start;
  for (let probe = start + HOUR_MS; probe <= end; probe += HOUR_MS) {
    if (getTimezoneOffset(new Date(probe)) !== offset) {
      previous = probe;
      continue;
    }

    let lowerSecond = Math.floor(previous / 1_000);
    let upperSecond = Math.floor(probe / 1_000);
    while (lowerSecond + 1 < upperSecond) {
      const middleSecond = Math.floor((lowerSecond + upperSecond) / 2);
      if (getTimezoneOffset(new Date(middleSecond * 1_000)) === offset) {
        upperSecond = middleSecond;
      } else {
        lowerSecond = middleSecond;
      }
    }
    return upperSecond * 1_000;
  }
  return null;
};

const scheduledSecondsFrom = (
  hours: CronField,
  minutes: CronField,
  seconds: CronField,
  minimum: number,
  limit: number,
): readonly number[] => {
  const matches: number[] = [];
  for (const hour of hours.values) {
    if ((hour + 1) * 3_600 <= minimum) continue;
    for (const minute of minutes.values) {
      if (hour * 3_600 + (minute + 1) * 60 <= minimum) continue;
      for (const second of seconds.values) {
        const secondOfDay = hour * 3_600 + minute * 60 + second;
        if (secondOfDay < minimum) continue;
        matches.push(secondOfDay);
        if (matches.length === limit) return matches;
      }
    }
  }
  return matches;
};

const wallDateCandidates = (
  year: number,
  month: number,
  day: number,
  hours: CronField,
  minutes: CronField,
  seconds: CronField,
  capturedNow: Date,
  getTimezoneOffset: TimezoneOffsetResolver,
): { dates: readonly Date[]; checkedCandidates: number } => {
  const wallTimestamp = Date.UTC(year, month - 1, day);
  if (!Number.isFinite(wallTimestamp))
    return { dates: [], checkedCandidates: 0 };

  const candidates = new Map<number, Date>();
  let checkedCandidates = 0;
  for (const offset of offsetsForWallDate(wallTimestamp, getTimezoneOffset)) {
    const firstValidInstant = firstInstantWithOffset(
      wallTimestamp,
      offset,
      getTimezoneOffset,
    );
    if (firstValidInstant === null) continue;

    const minimumFromOffset = Math.ceil(
      (firstValidInstant + offset * HOUR_MS - wallTimestamp) / 1_000,
    );
    const minimumAfterNow =
      Math.floor(
        (capturedNow.getTime() + offset * HOUR_MS - wallTimestamp) / 1_000,
      ) + 1;
    const scheduledSeconds = scheduledSecondsFrom(
      hours,
      minutes,
      seconds,
      Math.max(0, minimumFromOffset, minimumAfterNow),
      5,
    );
    checkedCandidates += scheduledSeconds.length;

    for (const secondOfDay of scheduledSeconds) {
      const candidateParts = {
        year,
        month,
        day,
        hour: Math.floor(secondOfDay / 3_600),
        minute: Math.floor((secondOfDay % 3_600) / 60),
        second: secondOfDay % 60,
      };
      const candidate = new Date(wallAsUtc(candidateParts) - offset * HOUR_MS);
      const actualOffset = getTimezoneOffset(candidate);
      if (
        Number.isFinite(actualOffset) &&
        sameWallParts(
          candidateParts,
          partsFromShiftedDate(candidate, actualOffset),
        )
      ) {
        candidates.set(candidate.getTime(), candidate);
      }
    }
  }
  return {
    dates: [...candidates.values()].sort(
      (left, right) => left.getTime() - right.getTime(),
    ),
    checkedCandidates,
  };
};

const isWallDateBefore = (
  year: number,
  month: number,
  day: number,
  start: WallParts,
): boolean =>
  year < start.year ||
  (year === start.year && month < start.month) ||
  (year === start.year && month === start.month && day < start.day);

const matchesCalendarDay = (
  schedule: ParsedCronSchedule,
  year: number,
  month: number,
  day: number,
): boolean => {
  const daysOfMonth = schedule.daysOfMonth;
  const daysOfWeek = schedule.daysOfWeek;
  if (daysOfMonth === null || daysOfWeek === null) return false;
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const matchesDayOfMonth = daysOfMonth.values.includes(day);
  const matchesDayOfWeek = daysOfWeek.values.includes(dayOfWeek);

  if (schedule.fieldCount === 5) {
    if (daysOfMonth.wildcard && daysOfWeek.wildcard) return true;
    if (daysOfMonth.wildcard) return matchesDayOfWeek;
    if (daysOfWeek.wildcard) return matchesDayOfMonth;
    return matchesDayOfMonth || matchesDayOfWeek;
  }

  if (daysOfMonth.wildcard && daysOfWeek.wildcard) return true;
  if (daysOfMonth.wildcard) return matchesDayOfWeek;
  if (daysOfWeek.wildcard) return matchesDayOfMonth;
  return matchesDayOfMonth && matchesDayOfWeek;
};

export function nextCronOccurrences(
  input: string,
  capturedNow: Date,
  getTimezoneOffset: TimezoneOffsetResolver,
): NextCronResult {
  const schedule = parseCronSchedule(input);
  if (schedule === null) {
    return {
      status: 'unavailable',
      occurrences: [],
      checkedCandidates: 0,
      reason: 'invalid',
    };
  }
  if (schedule.advanced) {
    return {
      status: 'unavailable',
      occurrences: [],
      checkedCandidates: 0,
      reason: 'unsupported-advanced',
    };
  }

  const nowOffset = getTimezoneOffset(capturedNow);
  if (!Number.isFinite(nowOffset)) {
    return {
      status: 'unavailable',
      occurrences: [],
      checkedCandidates: 0,
      reason: 'invalid',
    };
  }
  const start = partsFromShiftedDate(capturedNow, nowOffset);
  const maxYear = Math.min(9999, start.year + MAX_YEAR_SPAN);
  const occurrences: Date[] = [];
  const seen = new Set<number>();
  let checkedCandidates = 0;
  const seconds = schedule.seconds;
  const minutes = schedule.minutes;
  const hours = schedule.hours;
  const daysOfMonth = schedule.daysOfMonth;
  const months = schedule.months;
  const daysOfWeek = schedule.daysOfWeek;
  if (
    seconds === null ||
    minutes === null ||
    hours === null ||
    daysOfMonth === null ||
    months === null ||
    daysOfWeek === null
  ) {
    return {
      status: 'unavailable',
      occurrences: [],
      checkedCandidates,
      reason: 'invalid',
    };
  }

  for (let year = start.year; year <= maxYear; year += 1) {
    if (schedule.years !== null && !schedule.years.values.includes(year))
      continue;
    for (const month of months.values) {
      if (month < 1 || month > 12) continue;
      for (let day = 1; day <= daysInMonth(year, month); day += 1) {
        if (
          isWallDateBefore(year, month, day, start) ||
          !matchesCalendarDay(schedule, year, month, day)
        )
          continue;
        const dayCandidates = wallDateCandidates(
          year,
          month,
          day,
          hours,
          minutes,
          seconds,
          capturedNow,
          getTimezoneOffset,
        );
        checkedCandidates += dayCandidates.checkedCandidates;
        if (checkedCandidates > MAX_WALL_CANDIDATES) {
          return {
            status: 'unavailable',
            occurrences: [],
            checkedCandidates,
            reason: 'search-budget-exceeded',
          };
        }
        for (const candidate of dayCandidates.dates) {
          if (seen.has(candidate.getTime())) continue;
          seen.add(candidate.getTime());
          occurrences.push(candidate);
        }
        if (occurrences.length >= 5) {
          occurrences.sort((left, right) => left.getTime() - right.getTime());
          return {
            status: 'ok',
            occurrences: occurrences.slice(0, 5),
            checkedCandidates,
          };
        }
      }
    }
  }

  if (occurrences.length > 0) {
    occurrences.sort((left, right) => left.getTime() - right.getTime());
    return { status: 'ok', occurrences, checkedCandidates };
  }
  return {
    status: 'none',
    occurrences: [],
    checkedCandidates,
    reason: 'horizon-exhausted',
  };
}
