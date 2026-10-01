import { JsonToolError, type JsonValue } from './shared';

// RFC 6901 §3: `~` is only valid as `~0` or `~1`
const INVALID_ESCAPE = /~(?![01])/;
// RFC 6901 §4: an array index is "0" or a digit run without a leading zero
const ARRAY_INDEX = /^(?:0|[1-9]\d*)$/;

// Splits an RFC 6901 pointer into unescaped reference tokens. The empty
// pointer refers to the whole document and yields no tokens.
export function parsePointer(pointer: string): string[] {
  if (pointer === '') return [];
  if (!pointer.startsWith('/')) {
    throw new JsonToolError(
      `Invalid JSON Pointer "${pointer}": it must be empty or start with "/".`,
    );
  }
  return pointer
    .slice(1)
    .split('/')
    .map((token) => {
      if (INVALID_ESCAPE.test(token)) {
        throw new JsonToolError(
          `Invalid JSON Pointer token "${token}": "~" must be followed by 0 or 1.`,
        );
      }
      // order matters: `~01` must decode to the literal `~1`, not `/`
      return token.replaceAll('~1', '/').replaceAll('~0', '~');
    });
}

// Resolves an RFC 6901 pointer against a parsed document. Objects are only
// traversed through own properties, so `/constructor` or `/__proto__` never
// reach Object.prototype.
export function evaluatePointer(doc: JsonValue, pointer: string): JsonValue {
  let current = doc;
  for (const token of parsePointer(pointer)) {
    if (Array.isArray(current)) {
      if (token === '-') {
        throw new JsonToolError(
          'Pointer token "-" refers to the element after the last one, which does not exist.',
        );
      }
      if (!ARRAY_INDEX.test(token)) {
        throw new JsonToolError(
          `Pointer token "${token}" is not a valid array index.`,
        );
      }
      const index = Number(token);
      if (index >= current.length) {
        throw new JsonToolError(
          `Pointer did not resolve: index ${index} is out of bounds (length ${current.length}).`,
        );
      }
      current = current[index];
    } else if (current !== null && typeof current === 'object') {
      if (!Object.hasOwn(current, token)) {
        throw new JsonToolError(
          `Pointer did not resolve: key "${token}" not found.`,
        );
      }
      current = current[token];
    } else {
      throw new JsonToolError(
        `Pointer did not resolve: cannot index into ${JSON.stringify(current)} with "${token}".`,
      );
    }
  }
  return current;
}
