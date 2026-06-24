import { CodeBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// prototype pollution guard: skip keys that would mutate Object.prototype
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

// RFC 4180 CSV field quoting: wrap in double quotes and double any internal quotes
function csvQuote(value: string): string {
  if (
    value.includes(',') ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r')
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// stringify a single cell value for CSV output
function cellValue(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

// collect union of keys across all rows in first-seen order
function unionKeys(rows: Record<string, unknown>[]): string[] {
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const row of rows) {
    for (const k of Object.keys(row)) {
      if (!seen.has(k)) {
        seen.add(k);
        keys.push(k);
      }
    }
  }
  return keys;
}

// convert an array of objects to a CSV string
function jsonToCsv(data: unknown): string {
  let rows: Record<string, unknown>[];

  if (Array.isArray(data)) {
    // must be an array of objects
    if (data.length === 0) return '';
    rows = data as Record<string, unknown>[];
  } else if (data !== null && typeof data === 'object') {
    // single object → treat as one-row array
    rows = [data as Record<string, unknown>];
  } else {
    throw new Error('Input must be a JSON object or array of objects.');
  }

  for (const row of rows) {
    if (row === null || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error('Each element in the JSON array must be an object.');
    }
  }

  const headers = unionKeys(rows);
  const headerRow = headers.map(csvQuote).join(',');
  const dataRows = rows.map((row) =>
    headers.map((h) => csvQuote(cellValue(row[h]))).join(','),
  );

  return [headerRow, ...dataRows].join('\n');
}

// RFC 4180 CSV parser that handles quoted fields with escaped quotes and embedded newlines/commas
function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let i = 0;
  const n = input.length;

  while (i < n) {
    // quoted field
    if (input[i] === '"') {
      i++; // skip opening quote
      let field = '';
      while (i < n) {
        if (input[i] === '"') {
          if (i + 1 < n && input[i + 1] === '"') {
            // escaped double-quote
            field += '"';
            i += 2;
          } else {
            i++; // skip closing quote
            break;
          }
        } else {
          field += input[i];
          i++;
        }
      }
      row.push(field);
      // after closing quote, expect , or end-of-field
      if (i < n && input[i] === ',') {
        i++;
      } else if (
        i < n &&
        (input[i] === '\n' || (input[i] === '\r' && input[i + 1] === '\n'))
      ) {
        if (input[i] === '\r') i++;
        i++;
        rows.push(row);
        row = [];
      } else if (i < n && input[i] === '\r') {
        i++;
        rows.push(row);
        row = [];
      }
    } else {
      // unquoted field: read until , or newline
      let field = '';
      while (
        i < n &&
        input[i] !== ',' &&
        input[i] !== '\n' &&
        input[i] !== '\r'
      ) {
        field += input[i];
        i++;
      }
      row.push(field);
      if (i < n && input[i] === ',') {
        i++;
      } else if (i < n && (input[i] === '\r' || input[i] === '\n')) {
        if (input[i] === '\r' && i + 1 < n && input[i + 1] === '\n') i++;
        i++;
        rows.push(row);
        row = [];
      }
    }
  }

  // push last row if it has content
  if (row.length > 0) {
    rows.push(row);
  }

  return rows;
}

// convert CSV to a JSON array of objects; first row is treated as headers
function csvToJson(input: string): string {
  const rows = parseCsv(input);
  if (rows.length < 1) throw new Error('CSV input is empty.');

  const headers = rows[0];
  const dataRows = rows.slice(1);

  const result = dataRows.map((cells) => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      const key = headers[i];
      // skip forbidden keys to prevent prototype pollution
      if (FORBIDDEN_KEYS.has(key)) continue;
      obj[key] = cells[i] ?? '';
    }
    return obj;
  });

  return JSON.stringify(result, null, 2);
}

function errorBox(message: string, priority: number): Box {
  return new BoxBuilder('JSON / CSV Error', message)
    .setTemplate(CodeBoxTemplate)
    .setPriority(priority)
    .build();
}

export const JsonCsvBoxSource = {
  defaultDisabled: true,
  name: 'JSON / CSV',
  description:
    'Convert a JSON array of objects to CSV, or CSV to a JSON array of objects.',
  defaultInput: '[{"a":1,"b":2},{"a":3,"b":4}] ::jsoncsv',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'jsoncsv', 'csvjson')) return [];
    if (input.length > MAX_INPUT) return [];

    const trimmed = trim(input);
    const looksLikeJson = trimmed.startsWith('[') || trimmed.startsWith('{');

    if (looksLikeJson) {
      // attempt JSON→CSV
      try {
        const parsed = JSON.parse(trimmed);
        const csv = jsonToCsv(parsed);
        return [
          new BoxBuilder('JSON → CSV', csv)
            .setTemplate(CodeBoxTemplate)
            .setPriority(this.priority)
            .build(),
        ];
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return [errorBox(msg, this.priority)];
      }
    }

    // attempt CSV→JSON
    try {
      const json = csvToJson(trimmed);
      return [
        new BoxBuilder('CSV → JSON', json)
          .setTemplate(CodeBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return [errorBox(msg, this.priority)];
    }
  },
};

export default JsonCsvBoxSource;
