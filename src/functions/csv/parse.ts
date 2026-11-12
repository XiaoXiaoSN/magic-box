const QUOTE = 0x22;
const LF = 0x0a;
const CR = 0x0d;
const SPACE = 0x20;
const TAB = 0x09;

export interface DelimitedParse {
  rows: string[][];
  /** index of the opening quote when the text ends inside a quoted field */
  unterminatedQuoteAt: number | null;
  /** true when `maxRecords` stopped the scan before the end of the text */
  truncated: boolean;
}

/**
 * Reads delimiter-separated text the way people paste it: RFC 4180 quoting
 * (`""` escapes, quoted delimiters and line breaks), spaces around unquoted
 * fields dropped, CRLF/CR/LF all ending a record, and records with no content
 * skipped. Malformed quoting degrades to literal text instead of losing data.
 *
 * `delimiter` must be a single UTF-16 code unit. Unquoted fields are sliced
 * straight out of `text`, so the scan is one pass with no per-character
 * string building.
 */
export function parseDelimited(
  text: string,
  delimiter: string,
  maxRecords = Number.POSITIVE_INFINITY,
): DelimitedParse {
  const d = delimiter.charCodeAt(0);
  const n = text.length;
  const rows: string[][] = [];
  let row: string[] = [];
  let unterminatedQuoteAt: number | null = null;
  let truncated = false;
  let i = 0;

  // a space/tab is padding unless it is itself the delimiter
  const isPad = (c: number): boolean => (c === SPACE || c === TAB) && c !== d;
  const scanToFieldEnd = (): void => {
    while (i < n) {
      const c = text.charCodeAt(i);
      if (c === d || c === LF || c === CR) return;
      i += 1;
    }
  };
  const trimTrailingPad = (value: string): string => {
    let end = value.length;
    while (end > 0 && isPad(value.charCodeAt(end - 1))) end -= 1;
    return end === value.length ? value : value.slice(0, end);
  };
  const endRecord = (): void => {
    if (row.some((cell) => cell !== '')) rows.push(row);
    row = [];
  };

  for (;;) {
    while (i < n && isPad(text.charCodeAt(i))) i += 1;

    let value: string;
    if (i < n && text.charCodeAt(i) === QUOTE) {
      const open = i;
      i += 1;
      let chunkStart = i;
      value = '';
      for (;;) {
        const close = text.indexOf('"', i);
        if (close === -1) {
          value += text.slice(chunkStart);
          i = n;
          unterminatedQuoteAt = open;
          break;
        }
        if (text.charCodeAt(close + 1) === QUOTE) {
          value += text.slice(chunkStart, close + 1);
          i = close + 2;
          chunkStart = i;
          continue;
        }
        value += text.slice(chunkStart, close);
        i = close + 1;
        break;
      }
      // text between a closing quote and the next delimiter is malformed;
      // keep it (`"5" inch` → `5 inch`) rather than dropping data silently
      const tailStart = i;
      scanToFieldEnd();
      if (i > tailStart) value += trimTrailingPad(text.slice(tailStart, i));
    } else {
      const start = i;
      scanToFieldEnd();
      value = trimTrailingPad(text.slice(start, i));
    }
    row.push(value);

    if (i >= n) {
      endRecord();
      break;
    }
    const c = text.charCodeAt(i);
    if (c === d) {
      // a delimiter at the very end still opens one final (empty) field
      i += 1;
      continue;
    }
    i += c === CR && text.charCodeAt(i + 1) === LF ? 2 : 1;
    endRecord();
    if (i >= n) break;
    if (rows.length >= maxRecords) {
      truncated = true;
      break;
    }
  }

  return { rows, unterminatedQuoteAt, truncated };
}
