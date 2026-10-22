import {
  errorMessage,
  JsonToolError,
  type JsonValue,
  parseJson,
  stringifyJson,
} from './shared';

// 'to'   JSON array → JSONL
// 'from' JSONL → JSON array
// 'auto' 'to' when the whole input is one JSON array, otherwise 'from'
export type JsonlMode = 'to' | 'from' | 'auto';

export interface JsonlResult {
  direction: 'to' | 'from';
  output: string;
}

// Converts between a JSON array and JSONL (one JSON value per line).
//
// 'auto' cannot always round-trip: a single JSONL line that is itself an array
// (e.g. `[1,2]`) is also a valid JSON array, and auto reads it as one. Use
// 'from' to force the JSONL reading.
export function convertJsonl(input: string, mode: JsonlMode): JsonlResult {
  if (mode !== 'from') {
    let whole: JsonValue | undefined;
    let wholeError: unknown;
    try {
      whole = parseJson(input);
    } catch (err) {
      wholeError = err;
    }
    if (Array.isArray(whole)) {
      return {
        direction: 'to',
        output: whole.map((item) => stringifyJson(item)).join('\n'),
      };
    }
    if (mode === 'to') {
      throw new JsonToolError(
        wholeError === undefined
          ? 'Input must be a JSON array to convert to JSONL.'
          : `Input is not valid JSON: ${errorMessage(wholeError)}`,
      );
    }
  }
  return {
    direction: 'from',
    output: stringifyJson(parseJsonl(input), 2),
  };
}

// Parses JSONL into its values. Blank lines are skipped; reported line numbers
// refer to the original input so the user can find the failing line.
export function parseJsonl(input: string): JsonValue[] {
  const values: JsonValue[] = [];
  const lines = input.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue;
    try {
      values.push(parseJson(line, `Line ${i + 1}`));
    } catch (err) {
      if (err instanceof JsonToolError) throw err;
      throw new JsonToolError(
        `Line ${i + 1} is not valid JSON: ${errorMessage(err)}`,
      );
    }
  }
  if (values.length === 0) {
    throw new JsonToolError('JSONL input contains no values.');
  }
  return values;
}
