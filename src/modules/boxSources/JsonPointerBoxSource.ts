import { CodeBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;
const MAX_POINTER_LEN = 1000;

// resolves an RFC 6901 JSON Pointer against a parsed value; returns the found
// value or a sentinel symbol when the path does not exist
const NOT_FOUND = Symbol('not-found');

function resolvePointer(
  doc: unknown,
  pointer: string,
): unknown | typeof NOT_FOUND {
  // empty pointer → whole document (RFC 6901 §4)
  if (pointer === '') return doc;

  if (!pointer.startsWith('/')) return NOT_FOUND;

  // split on '/', drop the leading empty segment produced by the leading '/'
  const tokens = pointer
    .split('/')
    .slice(1)
    .map((t) =>
      // unescape ~1 first, then ~0 (order matters per RFC 6901 §3)
      t.replace(/~1/g, '/').replace(/~0/g, '~'),
    );

  let current: unknown = doc;
  for (const token of tokens) {
    if (Array.isArray(current)) {
      // '-' denotes past-the-end in RFC 6901; not a readable index
      if (token === '-') return NOT_FOUND;
      const idx = Number(token);
      if (!Number.isInteger(idx) || idx < 0 || String(idx) !== token)
        return NOT_FOUND;
      if (idx >= current.length) return NOT_FOUND;
      current = current[idx];
    } else if (current !== null && typeof current === 'object') {
      if (!Object.hasOwn(current as object, token)) return NOT_FOUND;
      current = (current as Record<string, unknown>)[token];
    } else {
      return NOT_FOUND;
    }
  }
  return current;
}

export const JsonPointerBoxSource = {
  name: 'JSON Pointer',
  description:
    'Resolve an RFC 6901 JSON Pointer (e.g. /a/b/0) against JSON input.',
  defaultInput: '{"a":{"b":[10,20]}} ::jsonpointer=/a/b/1',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'jsonpointer', 'jptr')) return [];
    if (input.length > MAX_INPUT) return [];

    // extract the pointer value; bare flag (true) means empty string (whole doc)
    const raw = extractOptionKeys(options, 'jsonpointer', 'jptr');
    const pointer = raw === true || raw === null ? '' : String(raw);

    if (pointer.length > MAX_POINTER_LEN) return [];

    const makeBox = (output: string) =>
      new BoxBuilder('JSON Pointer', output)
        .setOptions({ language: 'json' })
        .setTemplate(CodeBoxTemplate)
        .setPriority(this.priority)
        .build();

    let doc: unknown;
    try {
      doc = JSON.parse(trim(input));
    } catch {
      return [makeBox('Invalid JSON input.')];
    }

    // validate pointer format before walking: must be empty or start with '/'
    if (pointer !== '' && !pointer.startsWith('/')) {
      return [
        makeBox(`Invalid JSON Pointer: "${pointer}" must start with "/".`),
      ];
    }

    const result = resolvePointer(doc, pointer);
    if (result === NOT_FOUND) {
      return [makeBox(`Pointer "${pointer}" was not found in the document.`)];
    }

    return [makeBox(JSON.stringify(result, null, 2))];
  },
};

export default JsonPointerBoxSource;
