import type { BoxOptions } from '@modules/Box';

import { CSV_EXPLICIT_INPUT_LIMIT, detectTableShape } from './detect';

export const CSV_DELIMITER_NAMES: Readonly<Record<string, string>> = {
  tab: '\t',
  '\\t': '\t',
  space: ' ',
  comma: ',',
  semicolon: ';',
  pipe: '|',
};

// output targets: each one adds a box rendering the table in that format.
export const CSV_TARGET_OPTIONS = {
  csv: ['csv', 'tocsv'],
  tsv: ['tsv', 'totsv'],
  markdown: ['md', 'markdown'],
  json: ['json', 'tojson'],
} as const satisfies Record<string, readonly string[]>;

export type CsvTarget = keyof typeof CSV_TARGET_OPTIONS;

export const CSV_COLUMN_KEYS = ['col', 'column'] as const;
export const CSV_DELIMITER_KEYS = ['sep', 'delimiter'] as const;
export const CSV_HEADER_KEY = 'header';
export const CSV_NO_HEADER_KEY = 'noheader';

// `json`/`tojson` are shared with Data Converter, so they cannot by themselves
// mean "read this as a table". every other key here belongs to CSV alone.
export const CSV_SHARED_OPTION_KEYS: readonly string[] =
  CSV_TARGET_OPTIONS.json;

export const CSV_EXCLUSIVE_OPTION_KEYS: readonly string[] = [
  ...CSV_TARGET_OPTIONS.csv,
  ...CSV_TARGET_OPTIONS.tsv,
  ...CSV_TARGET_OPTIONS.markdown,
  ...CSV_COLUMN_KEYS,
  ...CSV_DELIMITER_KEYS,
  CSV_HEADER_KEY,
  CSV_NO_HEADER_KEY,
];

export const CSV_OPTION_KEYS: readonly string[] = [
  ...CSV_EXCLUSIVE_OPTION_KEYS,
  ...CSV_SHARED_OPTION_KEYS,
];

const hasAny = (options: BoxOptions, keys: readonly string[]): boolean =>
  options !== null && keys.some((key) => Object.hasOwn(options, key));

/** True when the user asked for the CSV tool by a key no other source owns. */
export function hasExclusiveCsvOption(options: BoxOptions): boolean {
  return hasAny(options, CSV_EXCLUSIVE_OPTION_KEYS);
}

/** Output formats requested by `::csv`, `::md`, ... in a stable order. */
export function requestedCsvTargets(options: BoxOptions): CsvTarget[] {
  return (Object.keys(CSV_TARGET_OPTIONS) as CsvTarget[]).filter((target) =>
    hasAny(options, CSV_TARGET_OPTIONS[target]),
  );
}

/** Shared ownership keeps Data Converter from also returning unselected JSON. */
export function csvOwnsJsonOutput(input: string, options: BoxOptions): boolean {
  if (!hasAny(options, CSV_SHARED_OPTION_KEYS)) return false;
  if (hasExclusiveCsvOption(options)) {
    if (hasAny(options, CSV_DELIMITER_KEYS)) return true;
    const text = input.trim();
    const fromJson =
      (text.startsWith('[') && text.endsWith(']')) ||
      (text.startsWith('{') && text.endsWith('}'));
    return !fromJson || hasAny(options, CSV_COLUMN_KEYS);
  }
  return (
    input.length <= CSV_EXPLICIT_INPUT_LIMIT && detectTableShape(input) !== null
  );
}
