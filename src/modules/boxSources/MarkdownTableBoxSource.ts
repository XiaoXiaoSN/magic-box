import { CodeBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;
// the byte cap doesn't bound the table shape; rows x cols is what drives work,
// so cap dimensions to keep the build linear and avoid an O(rows x cols) freeze
const MAX_COLS = 256;
const MAX_ROWS = 5_000;

// parse a single CSV row, handling double-quoted fields with embedded commas
function parseCsvRow(line: string): string[] {
  const cells: string[] = [];
  let i = 0;

  while (i < line.length) {
    if (line[i] === '"') {
      // quoted field
      let cell = '';
      i++; // skip opening quote
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') {
            // escaped double-quote
            cell += '"';
            i += 2;
          } else {
            i++; // skip closing quote
            break;
          }
        } else {
          cell += line[i];
          i++;
        }
      }
      // skip trailing comma
      if (line[i] === ',') i++;
      cells.push(cell);
    } else {
      // unquoted field
      const end = line.indexOf(',', i);
      if (end === -1) {
        cells.push(line.slice(i));
        break;
      }
      cells.push(line.slice(i, end));
      i = end + 1;
    }
  }

  return cells;
}

// sanitize a cell value for use inside a Markdown table cell
function sanitizeCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function buildMarkdownTable(headers: string[], rows: string[][]): string {
  const headerRow = `| ${headers.map(sanitizeCell).join(' | ')} |`;
  const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`;
  const dataRows = rows.map(
    (row) => `| ${row.map(sanitizeCell).join(' | ')} |`,
  );
  return [headerRow, separatorRow, ...dataRows].join('\n');
}

function buildErrorBox(): Box {
  return new BoxBuilder('Markdown Table', 'Error: could not parse input.')
    .setTemplate(CodeBoxTemplate)
    .setPriority(Priority)
    .build();
}

export const MarkdownTableBoxSource = {
  defaultDisabled: true,
  name: 'Markdown Table',
  description: 'Convert CSV or a JSON array of objects into a Markdown table.',
  defaultInput: 'name,age\nAlice,30\nBob,25 ::mdtable',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'mdtable', 'markdowntable')) return [];
    if (input.length > MAX_INPUT) return [];

    const trimmed = trim(input);

    let headers: string[];
    let rows: string[][];

    if (trimmed.startsWith('[')) {
      // attempt JSON array of objects
      let parsed: unknown;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        return [buildErrorBox()];
      }

      // every element must be a plain object, not just the first
      if (
        !Array.isArray(parsed) ||
        parsed.length === 0 ||
        parsed.length > MAX_ROWS ||
        !parsed.every(
          (o) => typeof o === 'object' && o !== null && !Array.isArray(o),
        )
      ) {
        return [buildErrorBox()];
      }

      // collect headers in first-seen order across all objects
      const headerSet = new Set<string>();
      for (const obj of parsed as Record<string, unknown>[]) {
        for (const key of Object.keys(obj)) {
          headerSet.add(key);
        }
      }
      headers = [...headerSet];
      if (headers.length > MAX_COLS) return [buildErrorBox()];

      rows = (parsed as Record<string, unknown>[]).map((obj) =>
        headers.map((h) => {
          const val = (obj as Record<string, unknown>)[h];
          return val === undefined || val === null ? '' : String(val);
        }),
      );
    } else {
      // parse as CSV
      const lines = trimmed.split('\n').filter((l) => l.trim() !== '');
      if (lines.length < 1 || lines.length > MAX_ROWS + 1) {
        return [buildErrorBox()];
      }

      const headerLine = parseCsvRow(lines[0]);
      if (headerLine.length === 0 || headerLine.length > MAX_COLS) {
        return [buildErrorBox()];
      }

      headers = headerLine;
      rows = lines.slice(1).map((line) => {
        const cells = parseCsvRow(line);
        // pad or trim row to match header count
        while (cells.length < headers.length) cells.push('');
        return cells.slice(0, headers.length);
      });
    }

    if (rows.length === 0) return [buildErrorBox()];

    const output = buildMarkdownTable(headers, rows);

    return [
      new BoxBuilder('Markdown Table', output)
        .setTemplate(CodeBoxTemplate)
        .setShowExpandButton(true)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default MarkdownTableBoxSource;
