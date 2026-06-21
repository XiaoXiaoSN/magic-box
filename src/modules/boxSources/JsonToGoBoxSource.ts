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
// initialisms (id → ID) per Go naming conventions
function toPascalCase(key: string): string {
  const pascal = key
    .replace(/[-_\s]+(.)/g, (_, ch: string) => ch.toUpperCase())
    .replace(/^(.)/, (ch: string) => ch.toUpperCase());
  return INITIALISMS.has(pascal.toUpperCase()) ? pascal.toUpperCase() : pascal;
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
): string {
  if (value === null) return 'interface{}';
  if (typeof value === 'boolean') return 'bool';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'int' : 'float64';
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]interface{}';
    const elemType = goTypeOf(value[0], fieldName, structs);
    return `[]${elemType}`;
  }
  // object — generate a nested named struct
  const structName = toPascalCase(fieldName);
  collectStructs(value as { [key: string]: JsonValue }, structName, structs);
  return structName;
}

// recursively builds struct definitions, depositing them into structs in dependency order
function collectStructs(
  obj: { [key: string]: JsonValue },
  structName: string,
  structs: Map<string, string>,
): void {
  const lines: string[] = [`type ${structName} struct {`];
  for (const [key, value] of Object.entries(obj)) {
    const goField = toPascalCase(key);
    const goType = goTypeOf(value, key, structs);
    lines.push(`\t${goField} ${goType} \`json:"${key}"\``);
  }
  lines.push('}');
  // insert before any struct that references this one (depth-first post-order)
  structs.set(structName, lines.join('\n'));
}

// generates Go struct code from a parsed JSON object
function jsonToGo(parsed: { [key: string]: JsonValue }): string {
  const structs = new Map<string, string>();
  collectStructs(parsed, 'Root', structs);

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
