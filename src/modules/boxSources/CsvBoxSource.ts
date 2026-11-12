import {
  CSV_COLUMN_KEYS,
  CSV_DELIMITER_KEYS,
  CSV_DELIMITER_NAMES,
  CSV_HEADER_KEY,
  CSV_NO_HEADER_KEY,
  CSV_SHARED_OPTION_KEYS,
  type CsvTarget,
  csvOwnsJsonOutput,
  hasExclusiveCsvOption,
  requestedCsvTargets,
} from '@functions/csv/commands';
import {
  CSV_AUTO_INPUT_LIMIT,
  CSV_EXPLICIT_INPUT_LIMIT,
  detectTableShape,
  looksLikeHeader,
  resolveTableShape,
  type TableShape,
} from '@functions/csv/detect';
import { parseDelimited } from '@functions/csv/parse';
import {
  CsvError,
  estimateJsonSize,
  selectColumns,
  type Table,
  tableFromJson,
  tableFromRecords,
  toDelimited,
  toJson,
  toMarkdown,
} from '@functions/csv/table';
import {
  JsonToolError,
  type JsonValue,
  parseJson,
} from '@functions/json/shared';
import type { Box, BoxOptions, BoxOptionValues } from '@modules/Box';
import {
  BoxBuilder,
  errorBox,
  extractOptionKeys,
  hasOptionKeys,
} from '@modules/Box';
import {
  MAX_WORKER_OUTPUT_LENGTH,
  MAX_WORKER_STRING_LENGTH,
} from '@modules/computeWorker/dto';

const SOURCE_NAME = 'CSV Table';
const OUTPUT_LIMIT = MAX_WORKER_STRING_LENGTH;

interface SourceTable {
  table: Table;
  /** what the input was read as, e.g. `TSV`; shown in box names */
  label: string;
  /** null when the input was JSON */
  delimiter: string | null;
}

type Output =
  | { kind: 'delimited'; delimiter: string }
  | { kind: 'markdown' }
  | { kind: 'json' }
  | { kind: 'list' };

function delimitedLabel(delimiter: string): string {
  if (delimiter === ',') return 'CSV';
  if (delimiter === '\t') return 'TSV';
  return `CSV (${delimiter === ' ' ? 'space' : delimiter})`;
}

function parseDelimiterOption(value: BoxOptionValues): string {
  if (typeof value === 'string') {
    const named = CSV_DELIMITER_NAMES[value.toLowerCase()];
    if (typeof named === 'string') return named;
    // the parser compares one UTF-16 code unit; quotes and breaks are syntax
    if (value.length === 1 && !/["\r\n]/.test(value)) return value;
  }
  throw new CsvError(
    'Give one delimiter character, e.g. ::sep=; or ::sep=| (also tab, space).',
  );
}

const lineOf = (text: string, index: number): number =>
  text.slice(0, index).split('\n').length;

function readDelimited(
  text: string,
  shape: TableShape,
  header: boolean | null,
): SourceTable {
  const body = text.slice(shape.bodyStart);
  const { rows, unterminatedQuoteAt } = parseDelimited(body, shape.delimiter);
  if (unterminatedQuoteAt !== null) {
    throw new CsvError(
      `A quoted field opened on line ${lineOf(text, shape.bodyStart + unterminatedQuoteAt)} is never closed.`,
    );
  }
  const hasHeader = header ?? (rows.length > 0 && looksLikeHeader(rows[0]));
  return {
    table: tableFromRecords(rows, hasHeader),
    label: delimitedLabel(shape.delimiter),
    delimiter: shape.delimiter,
  };
}

const isJsonDocument = (text: string): boolean =>
  (text.startsWith('[') && text.endsWith(']')) ||
  (text.startsWith('{') && text.endsWith('}'));

function readExplicit(text: string, options: BoxOptions): SourceTable {
  const wantsHeader = hasOptionKeys(options, CSV_HEADER_KEY);
  const wantsNoHeader = hasOptionKeys(options, CSV_NO_HEADER_KEY);
  if (wantsHeader && wantsNoHeader) {
    throw new CsvError('Use either ::header or ::noheader, not both.');
  }
  const header = wantsHeader ? true : wantsNoHeader ? false : null;

  const sepValue = extractOptionKeys(options, ...CSV_DELIMITER_KEYS);
  if (sepValue !== null) {
    const delimiter = parseDelimiterOption(sepValue);
    return readDelimited(text, { delimiter, bodyStart: 0 }, header);
  }

  if (isJsonDocument(text)) {
    let value: JsonValue;
    try {
      value = parseJson(text);
    } catch (error) {
      if (error instanceof JsonToolError) throw new CsvError(error.message);
      throw error;
    }
    const table = tableFromJson(value, header === true);
    if (header === false && table.header !== null) {
      return {
        table: { ...table, header: null },
        label: 'JSON',
        delimiter: null,
      };
    }
    return { table, label: 'JSON', delimiter: null };
  }

  return readDelimited(text, resolveTableShape(text), header);
}

function resolveOutputs(
  source: SourceTable,
  options: BoxOptions,
  columnsSelected: boolean,
  input: string,
): Output[] {
  const fromJson = source.delimiter === null;
  // JSON → JSON is Data Converter's job unless columns were picked out
  const targets = requestedCsvTargets(options).filter(
    (target) => target !== 'json' || csvOwnsJsonOutput(input, options),
  );
  if (targets.length > 0) return targets.map(targetOutput);

  if (columnsSelected) {
    if (source.table.width === 1) return [{ kind: 'list' }];
    return [{ kind: 'delimited', delimiter: source.delimiter ?? ',' }];
  }
  return fromJson
    ? [{ kind: 'delimited', delimiter: ',' }]
    : [{ kind: 'markdown' }, { kind: 'json' }];
}

function targetOutput(target: CsvTarget): Output {
  switch (target) {
    case 'csv':
      return { kind: 'delimited', delimiter: ',' };
    case 'tsv':
      return { kind: 'delimited', delimiter: '\t' };
    case 'markdown':
      return { kind: 'markdown' };
    case 'json':
      return { kind: 'json' };
  }
}

function render(
  table: Table,
  output: Output,
): { name: string; text: string; language: string } {
  switch (output.kind) {
    case 'delimited':
      return {
        name: delimitedLabel(output.delimiter),
        text: toDelimited(table, output.delimiter),
        language: 'text',
      };
    case 'markdown':
      return { name: 'Markdown', text: toMarkdown(table), language: 'text' };
    case 'json':
      if (estimateJsonSize(table) > OUTPUT_LIMIT) {
        throw new CsvError('The JSON for this table would be too large.');
      }
      return { name: 'JSON', text: toJson(table), language: 'json' };
    case 'list':
      return {
        name: table.header?.[0] ? `Column: ${table.header[0]}` : 'Column',
        text: table.rows.map((row) => row[0]).join('\n'),
        language: 'text',
      };
  }
}

function buildBoxes(source: SourceTable, outputs: readonly Output[]): Box[] {
  // Reserve room for format errors alongside the successful outputs.
  let remaining = MAX_WORKER_OUTPUT_LENGTH - 4096;
  return outputs.map((output) => {
    const name =
      output.kind === 'delimited'
        ? delimitedLabel(output.delimiter)
        : output.kind === 'markdown'
          ? 'Markdown'
          : output.kind === 'json'
            ? 'JSON'
            : 'Column';
    try {
      const rendered = render(source.table, output);
      if (rendered.text.length > OUTPUT_LIMIT) {
        throw new CsvError(
          `The ${name} output would be too large (limit ${OUTPUT_LIMIT} characters).`,
        );
      }
      const title = (
        output.kind === 'list' || rendered.name === source.label
          ? rendered.name
          : `${source.label} → ${rendered.name}`
      ).slice(0, 512);
      const size =
        title.length +
        rendered.text.length +
        'language'.length +
        rendered.language.length;
      if (size > remaining)
        throw new CsvError(
          `The ${name} output would exceed the combined output limit.`,
        );
      remaining -= size;
      return new BoxBuilder(title, rendered.text)
        .setOptions({ language: rendered.language })
        .setView('code')
        .build();
    } catch (error) {
      if (error instanceof CsvError)
        return errorBox(`${SOURCE_NAME} → ${name}`, error.message);
      throw error;
    }
  });
}

function autoBoxes(input: string, options: BoxOptions): Box[] {
  const jsonRequested = hasOptionKeys(options, ...CSV_SHARED_OPTION_KEYS);
  const limit = jsonRequested ? CSV_EXPLICIT_INPUT_LIMIT : CSV_AUTO_INPUT_LIMIT;
  if (input.length > limit) return [];

  const shape = detectTableShape(input);
  if (shape === null) return [];
  try {
    const source = readDelimited(input, shape, true);
    const outputs: Output[] = jsonRequested
      ? [{ kind: 'json' }]
      : [{ kind: 'markdown' }, { kind: 'json' }];
    const boxes = buildBoxes(source, outputs);
    return !jsonRequested && boxes.some((box) => box.props.isError)
      ? []
      : boxes;
  } catch (error) {
    // a guess stays silent; `::json` asked for this table, so it hears why
    if (error instanceof CsvError) {
      return jsonRequested ? [errorBox(SOURCE_NAME, error.message)] : [];
    }
    throw error;
  }
}

function explicitBoxes(input: string, options: BoxOptions): Box[] {
  if (input.length > CSV_EXPLICIT_INPUT_LIMIT) {
    return [
      errorBox(
        SOURCE_NAME,
        `Input is too large (${input.length} characters, limit ${CSV_EXPLICIT_INPUT_LIMIT}).`,
      ),
    ];
  }
  try {
    const source = readExplicit(input, options);
    // a lone header line (often a half-typed `::md5` or `::colormix` over
    // plain text) or only empty cells: there are no rows to show
    if (source.table.rows.length === 0) return [];
    const columnSpec = extractOptionKeys(options, ...CSV_COLUMN_KEYS);
    const selected =
      columnSpec === null
        ? source
        : {
            ...source,
            table: selectColumns(
              source.table,
              typeof columnSpec === 'string' ? columnSpec : '',
            ),
          };
    return buildBoxes(
      selected,
      resolveOutputs(selected, options, columnSpec !== null, input),
    );
  } catch (error) {
    if (error instanceof CsvError)
      return [errorBox(SOURCE_NAME, error.message)];
    throw error;
  }
}

export const CsvBoxSource = {
  name: SOURCE_NAME,
  description:
    'Auto-detects CSV/TSV tables (spreadsheet copies too) and converts them to Markdown and JSON. ' +
    '::csv, ::tsv, ::md, ::json pick outputs and also turn a JSON array into a table; ' +
    '::col=email keeps columns; ::sep=;, ::header, ::noheader adjust parsing.',
  defaultInput:
    'name,email,city\nAlice,alice@example.com,Taipei\nBob,bob@example.com,"Tokyo, Japan"',
  tag: 'CSV',
  kind: 'Convert',

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const text = input.replace(/^[ \r\n]+|[ \r\n]+$/g, '');
    if (text.trim() === '') return [];
    return hasExclusiveCsvOption(options)
      ? explicitBoxes(text, options)
      : autoBoxes(text, options);
  },
};

export default CsvBoxSource;
