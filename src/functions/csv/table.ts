import {
  createJsonObject,
  isJsonObject,
  type JsonValue,
  stringifyJson,
} from '@functions/json/shared';
import { isLosslessNumber } from 'lossless-json';

import { isNumericCell, lostLeadingCell, maxRowWidth } from './detect';

/** a user-facing failure; the message is shown verbatim in the error box */
export class CsvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CsvError';
  }
}

/** Rectangular table: every row (and the header, when present) has `width` cells. */
export interface Table {
  /** null when the first record is data rather than column names */
  header: string[] | null;
  rows: string[][];
  width: number;
}

const padRow = (row: readonly string[], width: number): string[] =>
  row.length === width
    ? [...row]
    : Array.from({ length: width }, (_, index) => row[index] ?? '');

/**
 * Squares parsed records into a table. Short rows are padded and long rows
 * widen the table, so no cell is ever dropped.
 */
export function tableFromRecords(
  records: readonly (readonly string[])[],
  delimiter: string,
  hasHeader: boolean,
): Table {
  const restored = lostLeadingCell(records, delimiter)
    ? [['', ...records[0]], ...records.slice(1)]
    : records;
  const width = maxRowWidth(restored);
  const squared = restored.map((row) => padRow(row, width));
  return hasHeader
    ? { header: squared[0] ?? [], rows: squared.slice(1), width }
    : { header: null, rows: squared, width };
}

function jsonCell(value: JsonValue): string {
  if (value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (isLosslessNumber(value)) return value.toString();
  // nested objects/arrays stay readable (and re-parsable) as compact JSON
  return stringifyJson(value);
}

/**
 * Turns parsed JSON into a table: an array of objects (keys in first-seen
 * order), an array of arrays (rows; headerless unless `header`), an array of
 * scalars (one column), or a single object (one row).
 */
export function tableFromJson(value: JsonValue, header: boolean): Table {
  const items = Array.isArray(value)
    ? value
    : isJsonObject(value)
      ? [value]
      : null;
  if (items === null) {
    throw new CsvError(
      'JSON input must be an array of objects or arrays to form a table.',
    );
  }
  if (items.length === 0) throw new CsvError('The JSON array is empty.');

  if (items.every(isJsonObject)) {
    const keys = new Set<string>();
    for (const item of items)
      for (const key of Object.keys(item)) keys.add(key);
    const columns = [...keys];
    const rows = items.map((item) =>
      columns.map((key) =>
        Object.hasOwn(item, key) ? jsonCell(item[key]) : '',
      ),
    );
    return { header: columns, rows, width: columns.length };
  }

  const isRow = (item: JsonValue): item is JsonValue[] => Array.isArray(item);
  const isScalar = (item: JsonValue): boolean =>
    !Array.isArray(item) && !isJsonObject(item);
  let records: string[][];
  if (items.every(isRow)) {
    records = items.map((item) => item.map(jsonCell));
  } else if (items.every(isScalar)) {
    records = items.map((item) => [jsonCell(item)]);
  } else {
    throw new CsvError(
      'The JSON array mixes objects, arrays and values, so it cannot form a table.',
    );
  }
  return tableFromRecords(records, ',', header);
}

/** Display label of a column for messages: its name, or `#n` when unnamed. */
const columnLabel = (table: Table, index: number): string =>
  table.header?.[index] || `#${index + 1}`;

/**
 * Keeps the columns named in `spec` (comma-separated header names, matched
 * exactly then case-insensitively, or 1-based positions) in the given order.
 */
export function selectColumns(table: Table, spec: string): Table {
  const tokens = spec
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token !== '');
  if (tokens.length === 0) {
    throw new CsvError(
      'Name the columns to keep, e.g. ::col=email or ::col=1,3 (1-based).',
    );
  }

  const indexes = tokens.map((token) => {
    const header = table.header;
    if (header !== null) {
      const exact = header.indexOf(token);
      if (exact !== -1) return exact;
      const lower = token.toLowerCase();
      const loose = header.findIndex((name) => name.toLowerCase() === lower);
      if (loose !== -1) return loose;
    }
    if (/^\d+$/.test(token)) {
      const position = Number(token);
      if (position >= 1 && position <= table.width) return position - 1;
    }
    const available =
      table.header === null
        ? `1-${table.width}`
        : Array.from({ length: table.width }, (_, index) =>
            columnLabel(table, index),
          ).join(', ');
    throw new CsvError(`Column "${token}" not found. Columns: ${available}`);
  });

  return {
    header: table.header && indexes.map((index) => table.header?.[index] ?? ''),
    rows: table.rows.map((row) => indexes.map((index) => row[index])),
    width: indexes.length,
  };
}

const escapeRegExp = (text: string): string =>
  text.replace(/[\\^$.*+?()[\]{}|/-]/g, '\\$&');

/**
 * Serializes RFC 4180 style. A field is quoted when it holds the delimiter, a
 * quote, a line break, or edge whitespace (which the reader would trim).
 */
export function toDelimited(table: Table, delimiter: string): string {
  const needsQuotes = new RegExp(
    `[${escapeRegExp(delimiter)}"\\r\\n]|^[ \\t]|[ \\t]$`,
  );
  const field = (value: string): string =>
    needsQuotes.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
  const lines = (table.header ? [table.header, ...table.rows] : table.rows).map(
    (row) => row.map(field).join(delimiter),
  );
  return lines.join('\n');
}

// Terminal-style column width: combining marks take none, East Asian wide and
// fullwidth characters (CJK, Hangul, fullwidth forms, most emoji) take two.
function codePointWidth(cp: number): number {
  if (
    (cp >= 0x300 && cp <= 0x36f) ||
    (cp >= 0x200b && cp <= 0x200d) ||
    (cp >= 0xfe00 && cp <= 0xfe0f) ||
    (cp >= 0xfe20 && cp <= 0xfe2f)
  ) {
    return 0;
  }
  if (
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2e80 && cp <= 0x303e) ||
    (cp >= 0x3041 && cp <= 0x33ff) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0xa000 && cp <= 0xa4cf) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe30 && cp <= 0xfe4f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x1f300 && cp <= 0x1f64f) ||
    (cp >= 0x1f900 && cp <= 0x1f9ff) ||
    (cp >= 0x20000 && cp <= 0x3fffd)
  ) {
    return 2;
  }
  return 1;
}

export function displayWidth(text: string): number {
  let width = 0;
  for (let i = 0; i < text.length; i += 1) {
    const cp = text.codePointAt(i) ?? 0;
    if (cp > 0xffff) i += 1;
    width += cp < 0x300 ? 1 : codePointWidth(cp);
  }
  return width;
}

const escapeMarkdownCell = (cell: string): string =>
  cell.replaceAll('|', '\\|').replace(/\r\n|\r|\n/g, '<br>');

// below this size a padded table is always worth it; above, only while
// padding at most doubles the output
const ALWAYS_PAD_CHARS = 256 * 1024;

/**
 * Renders a GitHub-flavored Markdown table. Columns are padded to line up in
 * monospace (CJK-aware) unless one very wide cell would bloat a big table,
 * and all-numeric columns are right-aligned. A headerless table gets an
 * empty header row, which GFM requires.
 */
export function toMarkdown(table: Table): string {
  const header = (table.header ?? Array<string>(table.width).fill('')).map(
    escapeMarkdownCell,
  );
  const rows = table.rows.map((row) => row.map(escapeMarkdownCell));
  const numeric = Array.from({ length: table.width }, (_, column) => {
    let filled = 0;
    for (const row of table.rows) {
      const cell = row[column];
      if (cell === '') continue;
      if (!isNumericCell(cell)) return false;
      filled += 1;
    }
    return filled > 0;
  });

  const widths = Array<number>(table.width).fill(3);
  let compactChars = 0;
  for (const row of [header, ...rows]) {
    for (const [column, cell] of row.entries()) {
      widths[column] = Math.max(widths[column], displayWidth(cell));
      compactChars += cell.length + 3;
    }
  }
  const lineWidth = widths.reduce((sum, width) => sum + width + 3, 1);
  const paddedChars = lineWidth * (rows.length + 2);
  const pad =
    paddedChars <= ALWAYS_PAD_CHARS || paddedChars <= compactChars * 2;

  const cellText = (cell: string, column: number): string => {
    if (!pad) return cell;
    const fill = ' '.repeat(widths[column] - displayWidth(cell));
    return numeric[column] ? fill + cell : cell + fill;
  };
  const line = (cells: readonly string[]): string =>
    `| ${cells.map(cellText).join(' | ')} |`;
  const rule = widths.map((width, column) => {
    const dashes = '-'.repeat(pad ? width : 3);
    return numeric[column] ? `${dashes.slice(1)}:` : dashes;
  });

  return [line(header), `| ${rule.join(' | ')} |`, ...rows.map(line)].join(
    '\n',
  );
}

/**
 * JSON object keys for a header: empty names become `column_<n>` and repeats
 * get `_2`, `_3`, ... so no column overwrites another.
 */
export function jsonKeys(header: readonly string[]): string[] {
  const seen = new Set<string>();
  return header.map((name, index) => {
    const base = name === '' ? `column_${index + 1}` : name;
    let key = base;
    for (let suffix = 2; seen.has(key); suffix += 1) key = `${base}_${suffix}`;
    seen.add(key);
    return key;
  });
}

/** Rough serialized size of `toJson(table)`, to refuse before building it. */
export function estimateJsonSize(table: Table): number {
  // per cell: indentation, quotes, `: `, comma and newline around the value
  const keyChars =
    table.header === null
      ? table.width * 10
      : jsonKeys(table.header).reduce((sum, key) => sum + key.length + 12, 0);
  let cellChars = 0;
  for (const row of table.rows)
    for (const cell of row) cellChars += cell.length;
  return table.rows.length * (keyChars + 8) + cellChars;
}

/**
 * An array of objects keyed by the header, or an array of arrays when the
 * table has none. Cells stay strings: CSV carries no types, and guessing one
 * would turn IDs or ZIP codes into numbers.
 */
export function toJson(table: Table): string {
  if (table.header === null) return stringifyJson(table.rows, 2);
  const keys = jsonKeys(table.header);
  const records = table.rows.map((row) => {
    // null prototype: a column named `__proto__` stays an ordinary key
    const record = createJsonObject();
    for (const [index, key] of keys.entries()) record[key] = row[index];
    return record;
  });
  return stringifyJson(records, 2);
}
