import {
  isInteger,
  isLosslessNumber,
  isSafeNumber,
  LosslessNumber,
  parse as parseLossless,
  stringify as stringifyLossless,
} from 'lossless-json';

export type JsonNumber = number | LosslessNumber;

export type JsonValue =
  | string
  | JsonNumber
  | boolean
  | null
  | JsonValue[]
  | JsonObject;

export interface JsonObject {
  [key: string]: JsonValue;
}

// a user-facing failure (bad input, unresolvable pointer, ...). the message is
// shown verbatim in the error box, so it must read as a sentence for the user.
export class JsonToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JsonToolError';
  }
}

export function isJsonObject(value: unknown): value is JsonObject {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !isLosslessNumber(value)
  );
}

// result objects are built on a null prototype: a JSON key named `__proto__`
// then lands as an ordinary own property instead of hitting the
// Object.prototype setter, so every key survives without a blacklist.
// JSON.stringify serialises null-prototype objects like plain ones.
export function createJsonObject(): JsonObject {
  return Object.create(null) as JsonObject;
}

const PROTOTYPE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const PROTECTED_KEY_PREFIX = '\u0000magic-box-json-key-';

interface ProtectedJson {
  text: string;
  replacements: ReadonlyMap<string, string>;
}

function protectPrototypeKeys(text: string): ProtectedJson {
  const replacements = new Map<string, string>();
  let output = '';
  let markerIndex = 0;

  for (let i = 0; i < text.length; ) {
    if (text[i] !== '"') {
      output += text[i];
      i += 1;
      continue;
    }

    const start = i;
    i += 1;
    while (i < text.length) {
      if (text[i] === '\\') {
        i += 2;
        continue;
      }
      if (text[i] === '"') {
        i += 1;
        break;
      }
      i += 1;
    }

    const token = text.slice(start, i);
    let next = i;
    while (/\s/.test(text[next] ?? '')) next += 1;

    let key: unknown;
    try {
      key = JSON.parse(token) as unknown;
    } catch {
      output += token;
      continue;
    }

    if (
      typeof key !== 'string' ||
      !PROTOTYPE_KEYS.has(key) ||
      text[next] !== ':'
    ) {
      output += token;
      continue;
    }

    let marker = `${PROTECTED_KEY_PREFIX}${markerIndex}`;
    while (text.includes(marker) || text.includes(JSON.stringify(marker))) {
      markerIndex += 1;
      marker = `${PROTECTED_KEY_PREFIX}${markerIndex}`;
    }
    markerIndex += 1;
    replacements.set(marker, key);
    output += JSON.stringify(marker);
  }

  return { text: output, replacements };
}

function parseNumber(value: string): JsonNumber {
  if (isInteger(value) && isSafeNumber(value)) return Number(value);
  return new LosslessNumber(value);
}

function normalizeJsonValue(
  value: unknown,
  replacements: ReadonlyMap<string, string>,
): JsonValue {
  if (isLosslessNumber(value)) return value;
  if (typeof value === 'bigint') return new LosslessNumber(value.toString());
  if (Array.isArray(value)) {
    return value.map((item) => normalizeJsonValue(item, replacements));
  }
  if (value !== null && typeof value === 'object') {
    const result = createJsonObject();
    for (const key of Object.keys(value)) {
      const safeKey = replacements.get(key) ?? key;
      result[safeKey] = normalizeJsonValue(
        (value as Record<string, unknown>)[key],
        replacements,
      );
    }
    return result;
  }
  return value as JsonValue;
}

export function parseJson(text: string, what = 'Input'): JsonValue {
  try {
    const protectedJson = protectPrototypeKeys(text);
    return normalizeJsonValue(
      parseLossless(protectedJson.text, null, parseNumber),
      protectedJson.replacements,
    );
  } catch (err) {
    throw new JsonToolError(`${what} is not valid JSON: ${errorMessage(err)}`);
  }
}

export function parseJsonObject(text: string, what = 'Input'): JsonObject {
  const value = parseJson(text, what);
  if (!isJsonObject(value)) {
    throw new JsonToolError(
      `${what} must be a JSON object, not ${describeType(value)}.`,
    );
  }
  return value;
}

export function describeType(value: JsonValue): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  if (isLosslessNumber(value)) return 'a number';
  return `a ${typeof value}`;
}

export function stringifyJson(value: unknown, space?: number | string): string {
  const output = stringifyLossless(value, null, space);
  if (output === undefined) {
    throw new JsonToolError('The result cannot be represented as JSON.');
  }
  return output;
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
