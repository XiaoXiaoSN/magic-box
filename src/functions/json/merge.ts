import {
  createJsonObject,
  isJsonObject,
  type JsonObject,
  JsonToolError,
  parseJsonObject,
} from './shared';

// a line holding only `---` separates documents. a raw newline can never occur
// inside a JSON string, so this split cannot cut through a value.
const SEPARATOR = /^---[ \t]*\r?$/m;

// Deep merge where the later object wins: nested objects merge key by key,
// every other value (array, scalar, null) replaces the earlier one.
// This is NOT RFC 7396 JSON Merge Patch — `null` is kept as a value rather
// than deleting the key. Neither input is mutated.
export function deepMerge(base: JsonObject, override: JsonObject): JsonObject {
  const result = Object.assign(createJsonObject(), base);
  for (const key of Object.keys(override)) {
    const next = override[key];
    // result has a null prototype, so a missing key reads as undefined rather
    // than an inherited Object.prototype member
    const prev = result[key];
    result[key] =
      isJsonObject(prev) && isJsonObject(next) ? deepMerge(prev, next) : next;
  }
  return result;
}

// Parses two or more `---`-separated JSON objects and folds them left to right.
export function mergeDocuments(input: string): JsonObject {
  const parts = input.split(SEPARATOR);
  if (parts.length < 2) {
    throw new JsonToolError(
      'Provide at least two JSON objects separated by a line containing only ---.',
    );
  }
  const docs = parts.map((part, i) =>
    parseJsonObject(part.trim(), `Document ${i + 1}`),
  );
  return docs.reduce(deepMerge);
}
