import { CodeBoxTemplate } from '@components/BoxTemplate';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// parse a single csv line respecting quoted fields with embedded commas, newlines, and "" escapes
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  // tracks whether the last token was followed by a comma; a trailing comma
  // means there is one more (empty) field after it
  let trailingComma = false;

  while (i < line.length) {
    trailingComma = false;

    if (line[i] === '"') {
      // quoted field
      let field = '';
      i++; // skip opening quote
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') {
            // escaped quote
            field += '"';
            i += 2;
          } else {
            // closing quote
            i++;
            break;
          }
        } else {
          field += line[i];
          i++;
        }
      }
      fields.push(field);
      if (line[i] === ',') {
        i++;
        trailingComma = true;
      }
    } else {
      // unquoted field — read until next comma
      const start = i;
      while (i < line.length && line[i] !== ',') i++;
      fields.push(line.slice(start, i));
      if (line[i] === ',') {
        i++;
        trailingComma = true;
      }
    }
  }

  // a line ending in ',' has a final empty field; an empty line is one field
  if (trailingComma || fields.length === 0) fields.push('');

  return fields;
}

// parse full csv text, handling quoted fields that span multiple lines
function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  const n = input.length;

  while (i < n) {
    // collect the logical line, respecting quoted multi-line fields
    let lineChars = '';
    while (i < n) {
      if (input[i] === '"') {
        lineChars += input[i];
        i++;
        while (i < n) {
          if (input[i] === '"') {
            lineChars += input[i];
            i++;
            if (input[i] === '"') {
              // escaped quote
              lineChars += input[i];
              i++;
            } else {
              break; // end of quoted field
            }
          } else {
            lineChars += input[i];
            i++;
          }
        }
      } else if (input[i] === '\n') {
        i++;
        break;
      } else if (input[i] === '\r') {
        i++;
        if (input[i] === '\n') i++;
        break;
      } else {
        lineChars += input[i];
        i++;
      }
    }

    rows.push(parseCsvLine(lineChars));
  }

  // drop fully-blank trailing rows
  while (
    rows.length > 0 &&
    rows[rows.length - 1].every((c) => c.trim() === '')
  ) {
    rows.pop();
  }

  return rows;
}

// escape pipe chars and replace embedded newlines with <br> for markdown table cells
function escapeCell(cell: string): string {
  return cell.replace(/\|/g, '\\|').replace(/\r\n|\r|\n/g, '<br>');
}

function buildMarkdownTable(rows: string[][]): string {
  const [header, ...dataRows] = rows;
  const colCount = header.length;

  const formatRow = (cells: string[]) => {
    // clamp to header width; pad short rows with empty cells
    const padded = Array.from({ length: colCount }, (_, i) =>
      escapeCell(cells[i] ?? ''),
    );
    return `| ${padded.join(' | ')} |`;
  };

  const separator = `| ${Array(colCount).fill('---').join(' | ')} |`;

  const lines = [formatRow(header), separator, ...dataRows.map(formatRow)];
  return lines.join('\n');
}

export const CsvToMarkdownBoxSource = {
  name: 'CSV to Markdown',
  description: 'Convert CSV (first row = header) into a Markdown table.',
  defaultInput: 'name,age\nAlice,30\nBob,25 ::csvmd',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'csvmd', 'csv2md')) return [];
    if (input.length > MAX_INPUT) return [];

    const rows = parseCsv(input.trim());

    if (rows.length === 0) {
      return [
        new BoxBuilder('CSV to Markdown', 'No CSV rows found.')
          .setTemplate(CodeBoxTemplate)
          .setOptions({ language: 'markdown' })
          .setPriority(this.priority)
          .build(),
      ];
    }

    const markdown = buildMarkdownTable(rows);

    return [
      new BoxBuilder('CSV to Markdown', markdown)
        .setTemplate(CodeBoxTemplate)
        .setOptions({ language: 'markdown' })
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default CsvToMarkdownBoxSource;
