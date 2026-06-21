import { CodeBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// maximum minutes to scan forward before giving up (≈5 years)
const MAX_SEARCH_MINUTES = 5 * 365 * 24 * 60;

interface CronFields {
  minute: number[];
  hour: number[];
  dom: number[];
  month: number[];
  dow: number[];
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
  // allow 7 as Sunday alias — normalise to 0
  const dowRaw = expandField(dowTok.replace(/\b7\b/g, '0'), 0, 6);

  if (!minute || !hour || !dom || !month || !dowRaw) return null;

  // deduplicate after 7→0 normalisation
  const dow = [...new Set(dowRaw)].sort((a, b) => a - b);

  return {
    minute,
    hour,
    dom,
    month,
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

  if (!fields.minute.includes(m)) return false;
  if (!fields.hour.includes(h)) return false;
  if (!fields.month.includes(month)) return false;

  // Vixie cron dom/dow rule:
  // if BOTH are restricted → match when EITHER dom OR dow matches
  // if only one is restricted → that one must match
  // if neither is restricted → always matches (already covered by '*' expanding to full range)
  const domMatch = fields.dom.includes(dom);
  const dowMatch = fields.dow.includes(dow);

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

export const CronNextBoxSource = {
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

    // parse ::count option, clamp to [1, 20], default 5
    const countRaw = extractOptionKeys(options, 'count');
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
    const fromRaw = extractOptionKeys(options, 'from');
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
        : 'No matching times found within 5 years.';

    const box = new BoxBuilder('Cron Next Runs', output)
      .setTemplate(CodeBoxTemplate)
      .setPriority(this.priority)
      .build();

    return [box];
  },
};

export default CronNextBoxSource;
