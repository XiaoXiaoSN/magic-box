import { CodeBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// maximum minutes to scan forward before giving up (≈1 year + leap margin).
// bounds the main-thread cost for impossible expressions like "0 0 30 2 *".
const MAX_SEARCH_MINUTES = 366 * 24 * 60;

interface CronFields {
  // sets for O(1) membership in the per-minute scan
  minute: Set<number>;
  hour: Set<number>;
  dom: Set<number>;
  month: Set<number>;
  dow: Set<number>;
  // whether the field was explicitly restricted (not a bare '*')
  domRestricted: boolean;
  dowRestricted: boolean;
}

/** Expands a single cron field token into a sorted array of allowed values. */
function expandField(token: string, min: number, max: number): number[] | null {
  const values = new Set<number>();

  for (const part of token.split(',')) {
    // */step
    if (part.startsWith('*/')) {
      const step = Number.parseInt(part.slice(2), 10);
      if (Number.isNaN(step) || step < 1) return null;
      for (let v = min; v <= max; v += step) values.add(v);
      continue;
    }

    // range with optional step: a-b or a-b/step
    if (part.includes('-')) {
      const [rangePart, stepStr] = part.split('/');
      const [aStr, bStr] = rangePart.split('-');
      const a = Number.parseInt(aStr, 10);
      const b = Number.parseInt(bStr, 10);
      if (Number.isNaN(a) || Number.isNaN(b) || a < min || b > max || a > b)
        return null;
      const step = stepStr !== undefined ? Number.parseInt(stepStr, 10) : 1;
      if (Number.isNaN(step) || step < 1) return null;
      for (let v = a; v <= b; v += step) values.add(v);
      continue;
    }

    // bare '*'
    if (part === '*') {
      for (let v = min; v <= max; v++) values.add(v);
      continue;
    }

    // single number
    const n = Number.parseInt(part, 10);
    if (Number.isNaN(n) || n < min || n > max) return null;
    values.add(n);
  }

  return [...values].sort((a, b) => a - b);
}

/** Parses a 5-field cron string into expanded field arrays. */
function parseCron(expr: string): CronFields | null {
  const fields = expr.split(/\s+/);
  if (fields.length !== 5) return null;

  const [minuteTok, hourTok, domTok, monthTok, dowTok] = fields;

  const minute = expandField(minuteTok, 0, 59);
  const hour = expandField(hourTok, 0, 23);
  const dom = expandField(domTok, 1, 31);
  // month is 1–12 in cron; we keep it that way and compare against getUTCMonth()+1
  const month = expandField(monthTok, 1, 12);
  // allow 7 as a Sunday alias; expand with max 7 then normalise 7→0 AFTER
  // expansion so ranges like "5-7" stay valid (pre-substitution broke them)
  const dowRaw = expandField(dowTok, 0, 7);

  if (!minute || !hour || !dom || !month || !dowRaw) return null;

  const dow = new Set(dowRaw.map((v) => (v === 7 ? 0 : v)));

  return {
    minute: new Set(minute),
    hour: new Set(hour),
    dom: new Set(dom),
    month: new Set(month),
    dow,
    domRestricted: domTok !== '*',
    dowRestricted: dowTok !== '*' && dowTok !== '*/1',
  };
}

/** Returns true when the UTC time represented by `date` matches the parsed cron. */
function matches(date: Date, fields: CronFields): boolean {
  const m = date.getUTCMinutes();
  const h = date.getUTCHours();
  const dom = date.getUTCDate();
  // getUTCMonth is 0-based; cron month field is 1-based
  const month = date.getUTCMonth() + 1;
  const dow = date.getUTCDay();

  if (!fields.minute.has(m)) return false;
  if (!fields.hour.has(h)) return false;
  if (!fields.month.has(month)) return false;

  // Vixie cron dom/dow rule:
  // if BOTH are restricted → match when EITHER dom OR dow matches
  // if only one is restricted → that one must match
  // if neither is restricted → always matches (already covered by '*' expanding to full range)
  const domMatch = fields.dom.has(dom);
  const dowMatch = fields.dow.has(dow);

  if (fields.domRestricted && fields.dowRestricted) {
    return domMatch || dowMatch;
  }
  if (fields.domRestricted) {
    return domMatch;
  }
  if (fields.dowRestricted) {
    return dowMatch;
  }
  // neither restricted — both are full ranges, always true here
  return true;
}

/** Advances `date` by one minute in-place and returns it. */
function addMinute(date: Date): Date {
  date.setUTCMinutes(date.getUTCMinutes() + 1, 0, 0);
  return date;
}

// max day each month can have (29 allows leap February)
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// cheap static check: when dom is the only date constraint (dow unrestricted),
// an impossible day/month pair (e.g. Feb 30) never matches. only prune in that
// case — under the Vixie OR-rule a restricted dow could still match.
function isDateSatisfiable(fields: CronFields): boolean {
  if (!fields.domRestricted || fields.dowRestricted) return true;
  for (const mo of fields.month) {
    for (const d of fields.dom) {
      if (d <= DAYS_IN_MONTH[mo - 1]) return true;
    }
  }
  return false;
}

export const CronNextBoxSource = {
  defaultDisabled: true,
  name: 'Cron Next Runs',
  description:
    'Compute the next run times of a 5-field cron expression. Optionally ::from=ISO and ::count=N.',
  defaultInput: '*/15 * * * * ::cronnext',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'cronnext')) return [];

    const expr = trim(input);
    // cron expressions are short; bound work before splitting
    if (expr.length > 200) return [];

    // parse ::count option, clamp to [1, 20], default 5
    const countRaw = extractOptionKeys(options, 'cronnextcount', 'count');
    const count = Math.min(
      20,
      Math.max(
        1,
        countRaw !== null && countRaw !== true
          ? Number.parseInt(String(countRaw), 10) || 5
          : 5,
      ),
    );

    // parse ::from option as base time, fall back to now
    const fromRaw = extractOptionKeys(options, 'cronnextfrom', 'from');
    let base: Date;
    if (fromRaw !== null && fromRaw !== true) {
      const parsed = new Date(String(fromRaw));
      base = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    } else {
      base = new Date();
    }

    const fields = parseCron(expr);
    if (fields === null) {
      const box = new BoxBuilder(
        'Cron Next Runs',
        `Invalid cron expression: "${expr}"\nExpected 5 fields: minute hour day-of-month month day-of-week`,
      )
        .setTemplate(CodeBoxTemplate)
        .setPriority(this.priority)
        .build();
      return [box];
    }

    // O(1) guard: when day-of-month is the sole date constraint, a value like
    // Feb 30 can never occur — bail before the scan instead of running it to
    // the cap (avoids a multi-ms main-thread block on impossible expressions)
    if (!isDateSatisfiable(fields)) {
      return [
        new BoxBuilder(
          'Cron Next Runs',
          'No matching times found within 1 year.',
        )
          .setTemplate(CodeBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // scan forward from base+1min
    const results: string[] = [];
    const cursor = new Date(base.getTime());
    // zero out seconds and ms, then add one minute
    cursor.setUTCSeconds(0, 0);
    addMinute(cursor);

    let scanned = 0;
    while (results.length < count && scanned < MAX_SEARCH_MINUTES) {
      if (matches(cursor, fields)) {
        results.push(cursor.toISOString());
      }
      addMinute(cursor);
      scanned++;
    }

    const output =
      results.length > 0
        ? results.join('\n')
        : 'No matching times found within 1 year.';

    const box = new BoxBuilder('Cron Next Runs', output)
      .setTemplate(CodeBoxTemplate)
      .setPriority(this.priority)
      .build();

    return [box];
  },
};

export default CronNextBoxSource;
