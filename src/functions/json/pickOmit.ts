import { createJsonObject, type JsonObject } from './shared';

// `a, b,,c` → ['a', 'b', 'c']. keys are top-level names, not paths: `a.b`
// selects a key literally named "a.b".
export function parseKeyList(raw: string): string[] {
  return raw
    .split(',')
    .map((key) => key.trim())
    .filter((key) => key.length > 0);
}

// Keeps only the listed top-level keys, in the source object's key order.
// Unlike jq's `pick`, a listed key that is absent is skipped, not set to null.
export function pickKeys(obj: JsonObject, keys: readonly string[]): JsonObject {
  const wanted = new Set(keys);
  return filterKeys(obj, (key) => wanted.has(key));
}

// Drops the listed top-level keys and keeps everything else.
export function omitKeys(obj: JsonObject, keys: readonly string[]): JsonObject {
  const unwanted = new Set(keys);
  return filterKeys(obj, (key) => !unwanted.has(key));
}

function filterKeys(
  obj: JsonObject,
  keep: (key: string) => boolean,
): JsonObject {
  const result = createJsonObject();
  for (const key of Object.keys(obj)) {
    if (keep(key)) result[key] = obj[key];
  }
  return result;
}
