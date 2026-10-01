export type JsonValue =
  | string
  | number
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
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// result objects are built on a null prototype: a JSON key named `__proto__`
// then lands as an ordinary own property instead of hitting the
// Object.prototype setter, so every key survives without a blacklist.
// JSON.stringify serialises null-prototype objects like plain ones.
export function createJsonObject(): JsonObject {
  return Object.create(null) as JsonObject;
}

export function parseJson(text: string, what = 'Input'): JsonValue {
  try {
    return JSON.parse(text) as JsonValue;
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
  return `a ${typeof value}`;
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
