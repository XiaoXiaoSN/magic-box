import { CodeBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// parses a single CSV row, handling quoted fields and "" escapes
function parseCsvRow(row: string): string[] {
  const fields: string[] = [];
  let i = 0;

  while (i < row.length) {
    if (row[i] === '"') {
      // quoted field: consume until closing quote, unescape "" → "
      let field = '';
      i++; // skip opening quote
      while (i < row.length) {
        if (row[i] === '"') {
          if (row[i + 1] === '"') {
            field += '"';
            i += 2;
          } else {
            i++; // skip closing quote
            break;
          }
        } else {
          field += row[i];
          i++;
        }
      }
      // skip optional comma after the closing quote
      if (row[i] === ',') i++;
      fields.push(field);
    } else {
      // unquoted field: read until next comma
      const end = row.indexOf(',', i);
      if (end === -1) {
        fields.push(row.slice(i));
        break;
      }
      fields.push(row.slice(i, end));
      i = end + 1;
    }
  }

  return fields;
}

export const CsvColumnBoxSource = {
  defaultDisabled: true,
  name: 'CSV Column',
  description:
    'Extract one column from CSV by 0-based index or header name. e.g. ::csvcol=1 or ::csvcol=email.',
  defaultInput: 'name,email\nAlice,a@x.com\nBob,b@y.com ::csvcol=email',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'csvcol', 'csvcolumn')) return [];
    if (input.length > MAX_INPUT) return [];

    // selector is the option value (column index or header name)
    const selectorRaw = extractOptionKeys(options, 'csvcol', 'csvcolumn');

    // bare flag (true) means the option was provided without a value
    if (selectorRaw === true || selectorRaw === null || selectorRaw === '') {
      return [
        new BoxBuilder(
          'CSV Column',
          'A column index or header name is required. e.g. ::csvcol=0 or ::csvcol=email',
        )
          .setTemplate(CodeBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const selector = trim(String(selectorRaw));

    // split lines, drop blanks
    const lines = input.split('\n').filter((l) => l.trim() !== '');
    if (lines.length === 0) return [];

    const headerRow = parseCsvRow(lines[0]);
    const dataRows = lines.slice(1).map(parseCsvRow);

    // resolve column index
    let colIndex: number;
    if (/^\d+$/.test(selector)) {
      colIndex = Number.parseInt(selector, 10);
    } else {
      // find header by trimmed case-sensitive match
      colIndex = headerRow.findIndex((h) => trim(h) === selector);
    }

    if (colIndex < 0 || colIndex >= headerRow.length) {
      return [
        new BoxBuilder(
          'CSV Column',
          `Column not found: "${selector}". Available headers: ${headerRow.map(trim).join(', ')}`,
        )
          .setTemplate(CodeBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const values = dataRows
      .map((row) => (colIndex < row.length ? row[colIndex] : ''))
      .join('\n');

    return [
      new BoxBuilder('CSV Column', values)
        .setTemplate(CodeBoxTemplate)
        .setShowExpandButton(true)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default CsvColumnBoxSource;
