import { CodeBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// common initialisms golint expects fully upper-cased in Go identifiers
const INITIALISMS = new Set([
  'ID',
  'URL',
  'URI',
  'API',
  'HTTP',
  'HTTPS',
  'JSON',
  'XML',
  'HTML',
  'SQL',
  'UUID',
  'IP',
  'TCP',
  'UDP',
  'DB',
]);

// converts a JSON key to a PascalCase Go identifier, upper-casing known
// initialisms per word (user_id / userId → UserID) per Go naming conventions
function toPascalCase(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // split camelCase boundaries
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  const pascal = words
    .map((w) => {
      const upper = w.toUpperCase();
      if (INITIALISMS.has(upper)) return upper;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join('');
  return pascal.length > 0 ? pascal : '_';
}

// make an identifier unique within a set (Foo, Foo2, Foo3, ...)
function uniqueName(base: string, used: Set<string>): string {
  let candidate = base;
  let n = 2;
  while (used.has(candidate)) {
    candidate = `${base}${n}`;
    n++;
  }
  used.add(candidate);
  return candidate;
}

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

// returns the Go type string for a JSON value, collecting nested struct definitions into structs
function goTypeOf(
  value: JsonValue,
  fieldName: string,
  structs: Map<string, string>,
  usedStructNames: Set<string>,
): string {
  if (value === null) return 'interface{}';
  if (typeof value === 'boolean') return 'bool';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'int' : 'float64';
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]interface{}';
    const elemType = goTypeOf(value[0], fieldName, structs, usedStructNames);
    return `[]${elemType}`;
  }
  // object — generate a nested named struct with a unique name
  const structName = uniqueName(toPascalCase(fieldName), usedStructNames);
  collectStructs(
    value as { [key: string]: JsonValue },
    structName,
    structs,
    usedStructNames,
  );
  return structName;
}

// recursively builds struct definitions, depositing them into structs in dependency order
function collectStructs(
  obj: { [key: string]: JsonValue },
  structName: string,
  structs: Map<string, string>,
  usedStructNames: Set<string>,
): void {
  const lines: string[] = [`type ${structName} struct {`];
  // dedupe field identifiers so keys that collide after PascalCase don't
  // produce two fields with the same Go name (illegal Go)
  const usedFields = new Set<string>();
  for (const [key, value] of Object.entries(obj)) {
    const goField = uniqueName(toPascalCase(key), usedFields);
    const goType = goTypeOf(value, key, structs, usedStructNames);
    lines.push(`\t${goField} ${goType} \`json:"${key}"\``);
  }
  lines.push('}');
  // insert before any struct that references this one (depth-first post-order)
  structs.set(structName, lines.join('\n'));
}

// generates Go struct code from a parsed JSON object
function jsonToGo(parsed: { [key: string]: JsonValue }): string {
  const structs = new Map<string, string>();
  const usedStructNames = new Set<string>(['Root']);
  collectStructs(parsed, 'Root', structs, usedStructNames);

  // emit nested structs first (insertion order preserves depth-first post-order),
  // then the Root struct last for readability
  const entries = Array.from(structs.entries());
  const rootIdx = entries.findIndex(([name]) => name === 'Root');
  const [rootEntry] = entries.splice(rootIdx, 1);
  entries.push(rootEntry);

  return entries.map(([, def]) => def).join('\n\n');
}

export const JsonToGoBoxSource = {
  name: 'JSON to Go',
  description: 'Generate a Go struct from a JSON sample.',
  defaultInput: '{"id":1,"name":"Bob"} ::gostruct',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'gostruct', 'jsontogo')) return [];
    if (input.length > MAX_INPUT) return [];

    const trimmed = trim(input);

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      const errorBox = new BoxBuilder('JSON to Go', 'Error: invalid JSON input')
        .setTemplate(CodeBoxTemplate)
        .setPriority(this.priority)
        .build();
      return [errorBox];
    }

    if (
      parsed === null ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
      const errorBox = new BoxBuilder(
        'JSON to Go',
        'Error: root value must be a JSON object',
      )
        .setTemplate(CodeBoxTemplate)
        .setPriority(this.priority)
        .build();
      return [errorBox];
    }

    const output = jsonToGo(parsed as { [key: string]: JsonValue });

    const box = new BoxBuilder('JSON to Go', output)
      .setTemplate(CodeBoxTemplate)
      .setPriority(this.priority)
      .build();

    return [box];
  },
};

export default JsonToGoBoxSource;
