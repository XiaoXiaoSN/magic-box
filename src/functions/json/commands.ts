import type { BoxOptions, BoxOptionValues } from '@modules/Box';

// `::option` aliases per JSON Tools operation. aliases of one operation are
// interchangeable; two different operations in one input are a conflict.
export const JSON_TOOL_OPERATIONS = {
  merge: ['jsonmerge', 'merge'],
  pick: ['jsonpick'],
  omit: ['jsonomit'],
  pointer: ['jsonpointer', 'jsonptr'],
  jsonl: ['jsonl', 'ndjson'],
  toJsonl: ['tojsonl'],
  fromJsonl: ['fromjsonl'],
} as const satisfies Record<string, readonly string[]>;

export type JsonToolOperation = keyof typeof JSON_TOOL_OPERATIONS;

export const JSON_TOOL_OPTION_KEYS: readonly string[] =
  Object.values(JSON_TOOL_OPERATIONS).flat();

export interface RequestedJsonTool {
  operation: JsonToolOperation;
  // the option as typed, e.g. `jsonpick`, for messages
  key: string;
  value: BoxOptionValues;
}

// Lists every JSON Tools operation present in `options`, one entry per
// operation however many of its aliases were given.
export function requestedJsonTools(options: BoxOptions): RequestedJsonTool[] {
  if (options === null) return [];
  const requested: RequestedJsonTool[] = [];
  for (const [operation, keys] of Object.entries(JSON_TOOL_OPERATIONS) as [
    JsonToolOperation,
    readonly string[],
  ][]) {
    const key = keys.find((k) => options[k] !== undefined);
    if (key !== undefined) {
      requested.push({ operation, key, value: options[key] });
    }
  }
  return requested;
}
