import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// max loop iterations to prevent runaway computation (100 years)
const MAX_RANGE_DAYS = 366 * 100;

// convert a key-value record to plaintext lines for box plaintextOutput
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

interface ParsedDates {
  startMs: number;
  endMs: number;
  swapped: boolean;
}

// parse "YYYY-MM-DD" strictly via Date.UTC to avoid timezone drift
function parseDateStr(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;

  const year = Number.parseInt(m[1], 10);
  const month = Number.parseInt(m[2], 10);
  const day = Number.parseInt(m[3], 10);

  // basic range checks before Date.UTC
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  const ms = Date.UTC(year, month - 1, day);
  // verify round-trip to reject dates like 2025-02-30
  const d = new Date(ms);
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() + 1 !== month ||
    d.getUTCDate() !== day
  ) {
    return null;
  }

  return ms;
}

// split input on " to " or "," separator and return the two date timestamps
function parseDatePair(text: string): ParsedDates | null {
  const parts = text.split(/\s+to\s+|,/).map((p) => p.trim());
  if (parts.length !== 2) return null;

  const aMs = parseDateStr(parts[0]);
  const bMs = parseDateStr(parts[1]);
  if (aMs === null || bMs === null) return null;

  const swapped = aMs > bMs;
  return {
    startMs: swapped ? bMs : aMs,
    endMs: swapped ? aMs : bMs,
    swapped,
  };
}

// count business days (Mon-Fri) inclusive between startMs and endMs (UTC epoch ms)
function countBusinessDays(
  startMs: number,
  endMs: number,
): { businessDays: number; calendarDays: number; weekendDays: number } {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const calendarDays = Math.round((endMs - startMs) / MS_PER_DAY) + 1;

  let businessDays = 0;
  let weekendDays = 0;
  let cur = startMs;
  while (cur <= endMs) {
    const dow = new Date(cur).getUTCDay(); // 0=Sun, 6=Sat
    if (dow >= 1 && dow <= 5) {
      businessDays++;
    } else {
      weekendDays++;
    }
    cur += MS_PER_DAY;
  }

  return { businessDays, calendarDays, weekendDays };
}

function errorBox(message: string, priority: number): Box {
  const kv = {
    Error: message,
    Format: 'YYYY-MM-DD to YYYY-MM-DD',
    Example: '2025-01-01 to 2025-01-31',
  };
  return new BoxBuilder('Business Days', kvToPlaintext(kv))
    .setTemplate(KeyValueBoxTemplate)
    .setOptions(kv)
    .setPriority(priority)
    .build();
}

export const BusinessDaysBoxSource = {
  defaultDisabled: true,
  name: 'Business Days',
  description:
    'Count business days (Mon–Fri) between two dates. Input: "YYYY-MM-DD to YYYY-MM-DD".',
  defaultInput: '2025-01-01 to 2025-01-31 ::busdays',
  tag: '#',
  kind: 'Calculate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'busdays', 'businessdays', 'workdays'))
      return [];

    const text = trim(input);
    if (text.length > 60) return [];

    const parsed = parseDatePair(text);
    if (!parsed) {
      return [errorBox('invalid date input', this.priority)];
    }

    const { startMs, endMs, swapped } = parsed;
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const rangeDays = Math.round((endMs - startMs) / MS_PER_DAY) + 1;

    if (rangeDays > MAX_RANGE_DAYS) {
      const kv = {
        Error: 'date range exceeds 100 years',
        'Max Range': '100 years',
      };
      return [
        new BoxBuilder('Business Days', kvToPlaintext(kv))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(kv)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const { businessDays, calendarDays, weekendDays } = countBusinessDays(
      startMs,
      endMs,
    );

    const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 10);
    const kv: Record<string, string> = {
      Start: fmt(startMs),
      End: fmt(endMs),
      'Calendar Days': calendarDays.toString(),
      'Business Days': businessDays.toString(),
      'Weekend Days': weekendDays.toString(),
    };
    if (swapped) {
      kv.Note = 'dates were swapped (start was after end)';
    }

    return [
      new BoxBuilder('Business Days', kvToPlaintext(kv))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kv)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default BusinessDaysBoxSource;
