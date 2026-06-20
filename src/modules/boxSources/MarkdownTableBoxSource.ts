import { CodeBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

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

function buildErrorBox(options: BoxOptions): Box {
  return new BoxBuilder('Markdown Table', 'Error: could not parse input.')
    .setTemplate(CodeBoxTemplate)
    .setOptions(options)
    .setPriority(Priority)
    .build();
}

export const MarkdownTableBoxSource = {
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
        return [buildErrorBox(options)];
      }

      if (
        !Array.isArray(parsed) ||
        parsed.length === 0 ||
        typeof parsed[0] !== 'object' ||
        parsed[0] === null
      ) {
        return [buildErrorBox(options)];
      }

      // collect headers in first-seen order across all objects
      const headerSet = new Map<string, true>();
      for (const obj of parsed as Record<string, unknown>[]) {
        for (const key of Object.keys(obj)) {
          headerSet.set(key, true);
        }
      }
      headers = [...headerSet.keys()];

      rows = (parsed as Record<string, unknown>[]).map((obj) =>
        headers.map((h) => {
          const val = (obj as Record<string, unknown>)[h];
          return val === undefined || val === null ? '' : String(val);
        }),
      );
    } else {
      // parse as CSV
      const lines = trimmed.split('\n').filter((l) => l.trim() !== '');
      if (lines.length < 1) return [buildErrorBox(options)];

      const headerLine = parseCsvRow(lines[0]);
      if (headerLine.length === 0) return [buildErrorBox(options)];

      headers = headerLine;
      rows = lines.slice(1).map((line) => {
        const cells = parseCsvRow(line);
        // pad or trim row to match header count
        while (cells.length < headers.length) cells.push('');
        return cells.slice(0, headers.length);
      });
    }

    if (rows.length === 0) return [buildErrorBox(options)];

    const output = buildMarkdownTable(headers, rows);

    return [
      new BoxBuilder('Markdown Table', output)
        .setTemplate(CodeBoxTemplate)
        .setOptions(options)
        .setShowExpandButton(true)
        .setPriority(Priority)
        .build(),
    ];
  },
};

export default MarkdownTableBoxSource;
