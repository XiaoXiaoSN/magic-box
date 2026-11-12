import { type DelimitedParse, parseDelimited } from './parse';

/** guessing runs on every keystroke, so it stays off for bigger pastes */
export const CSV_AUTO_INPUT_LIMIT = 256 * 1024;
/** an explicit request (`::csv`, `::json`, ...) may convert this much */
export const CSV_EXPLICIT_INPUT_LIMIT = 1024 * 1024;

// tab first: spreadsheet copies are tab-separated and a tab almost never
// appears in prose, so it is the strongest signal of the three
const CANDIDATES = ['\t', ',', ';'] as const;
const SNIFF_RECORDS = 64;
// the guess reads at most this much, so a keystroke costs the same on any paste
const SNIFF_CHARS = 64 * 1024;
const STYLE_SAMPLE_CHARS = 8 * 1024;

// Excel writes `sep=;` as the first line to name a non-default delimiter
const EXCEL_SEP_LINE = /^sep=([^\r\n])\r?\n/;
const NUMERIC_CELL =
  /^[-+]?(?:\d{1,3}(?:,\d{3})+|\d+)?(?:\.\d+)?(?:[eE][-+]?\d+)?%?$/;
const SENTENCE_END = /[.!?。！？]$/;
const BRACKET_PAIRS = [
  ['(', ')'],
  ['[', ']'],
  ['{', '}'],
] as const;

export interface TableShape {
  delimiter: string;
  /** offset where the table starts (after an Excel `sep=` line) */
  bodyStart: number;
}

interface ExcelSepLine {
  delimiter: string;
  bodyStart: number;
}

function readExcelSepLine(text: string): ExcelSepLine | null {
  const match = EXCEL_SEP_LINE.exec(text);
  return match ? { delimiter: match[1], bodyStart: match[0].length } : null;
}

/** Widest row; a loop rather than `Math.max(...)`, whose argument count is capped. */
export function maxRowWidth(rows: readonly (readonly string[])[]): number {
  let width = 0;
  for (const row of rows) if (row.length > width) width = row.length;
  return width;
}

export function isNumericCell(cell: string): boolean {
  return /\d/.test(cell) && NUMERIC_CELL.test(cell);
}

/**
 * A first row made only of numbers is data, not column names. Anything else
 * is treated as a header: real tables nearly always carry one.
 */
export function looksLikeHeader(firstRow: readonly string[]): boolean {
  const filled = firstRow.filter((cell) => cell !== '');
  return filled.length === 0 || !filled.every(isNumericCell);
}

/**
 * `parseInput` trims the whole input, so a spreadsheet copy whose top-left
 * cell is empty arrives with its first tab gone: the header row is exactly
 * one cell short while the body is full width. Only tabs are affected —
 * a leading comma or semicolon is not whitespace.
 */
export function lostLeadingCell(
  rows: readonly (readonly string[])[],
  delimiter: string,
): boolean {
  if (delimiter !== '\t' || rows.length < 2) return false;
  const width = maxRowWidth(rows);
  if (rows[0].length !== width - 1) return false;
  const body = rows.slice(1);
  // the last row may also be short: its trailing tabs were trimmed too
  return (
    body.slice(0, -1).every((row) => row.length === width) &&
    body.some((row) => row.length === width)
  );
}

function bracketsBalance(cell: string): boolean {
  for (const [open, close] of BRACKET_PAIRS) {
    if (cell.split(open).length !== cell.split(close).length) return false;
  }
  return true;
}

// `1,234,567` or a log's `10:00:00,123`: the comma splits a number, not cells
function splitsDigitGroup(row: readonly string[]): boolean {
  for (let index = 1; index < row.length; index += 1) {
    if (/\d$/.test(row[index - 1]) && /^\d{3}(?!\d)/.test(row[index])) {
      return true;
    }
  }
  return false;
}

function sniff(text: string, delimiter: string): DelimitedParse {
  if (text.length <= SNIFF_CHARS) {
    return parseDelimited(text, delimiter, SNIFF_RECORDS);
  }
  const parsed = parseDelimited(
    text.slice(0, SNIFF_CHARS),
    delimiter,
    SNIFF_RECORDS,
  );
  if (parsed.truncated) return parsed;
  // the window may cut the final record, or open a quote whose closing it
  // never sees; either way that record cannot be judged
  return {
    rows: parsed.rows.slice(0, -1),
    unterminatedQuoteAt: null,
    truncated: true,
  };
}

// prose and argument lists write `a, b`; machine CSV writes `a,b`
function everyDelimiterFollowedBySpace(
  text: string,
  delimiter: string,
): boolean {
  const sample = text.slice(0, STYLE_SAMPLE_CHARS);
  let seen = 0;
  for (
    let i = sample.indexOf(delimiter);
    i !== -1;
    i = sample.indexOf(delimiter, i + 1)
  ) {
    if (sample[i + 1] !== ' ') return false;
    seen += 1;
  }
  return seen > 0;
}

// Width of a candidate split that reads as a real table, or 0 when the
// candidate is rejected. Every check here guards against a false positive
// on text that merely contains the delimiter.
function strictWidth(text: string, delimiter: string): number {
  const { rows, unterminatedQuoteAt, truncated } = sniff(text, delimiter);
  if (unterminatedQuoteAt !== null || rows.length < 2) return 0;

  const width = maxRowWidth(rows);
  if (width < 2) return 0;

  const restored = lostLeadingCell(rows, delimiter);
  const lastIndex = rows.length - 1;
  const fullRows: (readonly string[])[] = [];
  for (const [index, row] of rows.entries()) {
    if (row.length === width) {
      fullRows.push(row);
      continue;
    }
    if (index === 0 && restored) continue;
    // trailing tabs of the final record were trimmed with the input
    if (index === lastIndex && delimiter === '\t' && !truncated) continue;
    return 0;
  }
  if (fullRows.length + (restored ? 1 : 0) < 2) return 0;

  const header = restored ? ['', ...rows[0]] : rows[0];
  if (!looksLikeHeader(header)) return 0;
  // only full-width rows vouch for a column: a restored header cell or a
  // trimmed last row would let tab-indented lines under a heading pass
  for (let column = 0; column < width; column += 1) {
    if (fullRows.every((row) => row[column] === '')) return 0;
  }
  const table = restored ? [header, ...rows.slice(1)] : rows;
  if (!table.every((row) => row.every(bracketsBalance))) return 0;
  if (delimiter === ',' && table.every(splitsDigitGroup)) return 0;

  if (
    delimiter !== '\t' &&
    everyDelimiterFollowedBySpace(text, delimiter) &&
    (width === 2 ||
      table.some((row) => SENTENCE_END.test(row[row.length - 1] ?? '')))
  ) {
    return 0;
  }
  return width;
}

/**
 * Recognizes a delimiter-separated table without being told: at least two
 * records of one consistent width (two or more columns), a non-numeric
 * header, and none of the shapes prose, code or JSON produce. Returns null
 * for anything doubtful — a wrong guess would add boxes to unrelated input.
 * Bounded to the first records so it is cheap enough for every keystroke.
 */
export function detectTableShape(text: string): TableShape | null {
  if (!/[\r\n]/.test(text)) return null;
  const head = text.trimStart()[0];
  if (head === '{' || head === '[' || head === '<') return null;

  const sepLine = readExcelSepLine(text);
  if (sepLine !== null) {
    const body = text.slice(sepLine.bodyStart);
    return strictWidth(body, sepLine.delimiter) > 0 ? sepLine : null;
  }

  let best: TableShape | null = null;
  let bestWidth = 0;
  for (const delimiter of CANDIDATES) {
    const width = strictWidth(text, delimiter);
    if (width === 0) continue;
    if (delimiter === '\t') return { delimiter, bodyStart: 0 };
    if (width > bestWidth) {
      best = { delimiter, bodyStart: 0 };
      bestWidth = width;
    }
  }
  return best;
}

/**
 * Picks a delimiter once the user has asked for a table, accepting ragged
 * rows: the strict guess when it succeeds, otherwise the candidate whose
 * most common row width (2+) covers the most rows. A text with no usable
 * delimiter is a single-column table, read with a comma.
 */
export function resolveTableShape(text: string): TableShape {
  const strict = detectTableShape(text);
  if (strict !== null) return strict;

  const sepLine = readExcelSepLine(text);
  if (sepLine !== null) return sepLine;

  let best: TableShape = { delimiter: ',', bodyStart: 0 };
  let bestScore = 0;
  let bestWidth = 0;
  for (const delimiter of CANDIDATES) {
    const { rows } = sniff(text, delimiter);
    if (rows.length === 0) continue;
    const counts = new Map<number, number>();
    for (const row of rows) {
      counts.set(row.length, (counts.get(row.length) ?? 0) + 1);
    }
    for (const [width, count] of counts) {
      if (width < 2) continue;
      const score = count / rows.length;
      if (score > bestScore || (score === bestScore && width > bestWidth)) {
        best = { delimiter, bodyStart: 0 };
        bestScore = score;
        bestWidth = width;
      }
    }
  }
  return best;
}
