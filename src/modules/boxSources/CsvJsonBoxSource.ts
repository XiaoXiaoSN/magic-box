import { CodeBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
// cap work to avoid DoS via uncapped ?input= URL param
const MAX_INPUT = 100_000;

// parse a single CSV row, handling quoted fields with embedded commas, newlines, and escaped quotes.
// a field is emitted at every comma and once after the loop, so a trailing empty field appears only
// when the row genuinely ends with a separator (no phantom column on a plain row)
function parseCsvRow(line: string): string[] {
  const fields: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"'; // escaped quote
          i++;
        } else {
          inQuotes = false; // closing quote
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(field);
      field = '';
    } else {
      field += ch;
    }
  }

  fields.push(field);
  return fields;
}

// split CSV text into logical rows, respecting quoted fields that span multiple lines
function splitCsvRows(text: string): string[] {
  const rows: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
      i++;
    } else if (
      !inQuotes &&
      (ch === '\n' || (ch === '\r' && text[i + 1] === '\n'))
    ) {
      rows.push(current);
      current = '';
      i += ch === '\r' ? 2 : 1;
    } else {
      current += ch;
      i++;
    }
  }

  if (current.length > 0) rows.push(current);

  return rows;
}

// quote a CSV field value if it contains commas, double-quotes, or newlines
function quoteCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function csvToJson(input: string): string {
  const rows = splitCsvRows(trim(input)).filter((r) => r.trim() !== '');
  if (rows.length === 0) throw new Error('empty CSV input');

  const headers = parseCsvRow(rows[0]);
  if (headers.length === 0) throw new Error('no headers found in CSV');

  const result: Record<string, string>[] = [];

  for (let i = 1; i < rows.length; i++) {
    const fields = parseCsvRow(rows[i]);
    const obj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = fields[j] ?? '';
    }
    result.push(obj);
  }

  return JSON.stringify(result, null, 2);
}

function jsonToCsv(input: string): string {
  const parsed: unknown = JSON.parse(trim(input));

  if (!Array.isArray(parsed)) {
    throw new Error('JSON input must be an array of objects');
  }

  // collect union of keys in first-seen order
  const headerSet = new Set<string>();
  for (const item of parsed) {
    if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
      for (const key of Object.keys(item as Record<string, unknown>)) {
        headerSet.add(key);
      }
    }
  }

  const headers = Array.from(headerSet);
  const csvRows: string[] = [headers.map(quoteCsvField).join(',')];

  for (const item of parsed) {
    const record =
      item !== null && typeof item === 'object' && !Array.isArray(item)
        ? (item as Record<string, unknown>)
        : {};
    const row = headers.map((h) => quoteCsvField(String(record[h] ?? '')));
    csvRows.push(row.join(','));
  }

  return csvRows.join('\n');
}

export const CsvJsonBoxSource = {
  name: 'CSV / JSON',
  description:
    'Convert CSV to a JSON array of objects, or a JSON array back to CSV.',
  defaultInput: 'name,age\nAlice,30\nBob,25 ::csv',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'csv')) return [];
    if (input.length > MAX_INPUT) return [];

    const trimmed = trim(input);

    // detect direction: JSON array/object → CSV; everything else → JSON
    const looksLikeJson = trimmed.startsWith('[') || trimmed.startsWith('{');

    if (looksLikeJson) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        return [
          new BoxBuilder(
            'JSON → CSV',
            `Parse error: input looks like JSON but is invalid`,
          )
            .setTemplate(CodeBoxTemplate)
            .setPriority(this.priority)
            .build(),
        ];
      }

      if (!Array.isArray(parsed)) {
        return [
          new BoxBuilder(
            'JSON → CSV',
            'Error: JSON input must be an array of objects',
          )
            .setTemplate(CodeBoxTemplate)
            .setPriority(this.priority)
            .build(),
        ];
      }

      try {
        const output = jsonToCsv(trimmed);
        return [
          new BoxBuilder('JSON → CSV', output)
            .setTemplate(CodeBoxTemplate)
            .setPriority(this.priority)
            .build(),
        ];
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return [
          new BoxBuilder('JSON → CSV', `Error: ${msg}`)
            .setTemplate(CodeBoxTemplate)
            .setPriority(this.priority)
            .build(),
        ];
      }
    }

    // treat as CSV → JSON
    try {
      const output = csvToJson(trimmed);
      return [
        new BoxBuilder('CSV → JSON', output)
          .setTemplate(CodeBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return [
        new BoxBuilder('CSV → JSON', `Error: ${msg}`)
          .setTemplate(CodeBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }
  },
};

export default CsvJsonBoxSource;
