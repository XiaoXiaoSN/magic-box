import {
  DefaultBoxTemplate,
  KeyValueBoxTemplate,
} from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// extract the zone string from options — tzconvert takes priority over intz
function getZone(options: BoxOptions): string | null {
  if (!options) return null;
  const raw = options.tzconvert ?? options.intz;
  if (typeof raw === 'string') return raw || null;
  // bare flag (boolean true) means no value was supplied
  return null;
}

// format a date in the given IANA timezone as 'yyyy-MM-dd HH:mm:ss'
function formatInZone(date: Date, zone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? '??';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

// derive the UTC offset label (e.g. 'GMT+9') for a zone at a given instant
function getOffset(date: Date, zone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    timeZoneName: 'shortOffset',
  }).formatToParts(date);
  return parts.find((p) => p.type === 'timeZoneName')?.value ?? zone;
}

// validate that the zone string is a recognised IANA timezone
function validateZone(zone: string, date: Date): void {
  // Intl throws RangeError on an unknown timeZone
  new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric' }).format(
    date,
  );
}

function errorBox(name: string, message: string): Box {
  // a plain message box, not a key/value box
  return new BoxBuilder(name, message)
    .setTemplate(DefaultBoxTemplate)
    .setShowExpandButton(false)
    .setPriority(Priority)
    .build();
}

export const TimezoneConvertBoxSource = {
  name: 'Timezone Convert',
  description:
    'Show a date/time in a target IANA timezone. Input is an ISO date or "now"; zone via ::tzconvert=Asia/Tokyo.',
  defaultInput: '2024-01-01T12:00:00Z ::tzconvert=Asia/Tokyo',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'tzconvert', 'intz')) return [];

    const zone = getZone(options);

    // bare flag or empty value — no zone supplied
    if (!zone) {
      return [
        errorBox(
          'Timezone Convert',
          'A target timezone is required. Example: ::tzconvert=Asia/Tokyo',
        ),
      ];
    }

    // resolve the source time
    const s = trim(input);
    let date: Date;
    if (s === '' || s.toLowerCase() === 'now') {
      date = new Date();
    } else {
      date = new Date(s);
      if (Number.isNaN(date.getTime())) {
        return [
          errorBox(
            'Timezone Convert',
            `"${s}" is not a valid date. Use ISO 8601 or "now".`,
          ),
        ];
      }
    }

    // validate the timezone before formatting
    try {
      validateZone(zone, date);
    } catch {
      return [
        errorBox('Timezone Convert', `"${zone}" is not a valid IANA timezone.`),
      ];
    }

    const kvOptions: Record<string, string> = {
      Zone: zone,
      'Local Time': formatInZone(date, zone),
      UTC: date.toISOString(),
      Offset: getOffset(date, zone),
    };

    const box = new BoxBuilder('Timezone Convert', '')
      .setOptions(kvOptions)
      .setTemplate(KeyValueBoxTemplate)
      .setPriority(Priority)
      .build();

    return [box];
  },
};

export default TimezoneConvertBoxSource;
