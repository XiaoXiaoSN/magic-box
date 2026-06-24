import { CodeBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// reserved keys that would cause prototype pollution if written into a plain object
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

// returns a valid TS identifier check — keys containing spaces or special chars need quoting
function needsQuoting(key: string): boolean {
  return !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) || UNSAFE_KEYS.has(key);
}

// converts a string to PascalCase for use as an interface name
function toPascalCase(str: string): string {
  return str
    .replace(/[^A-Za-z0-9]+(.)/g, (_, ch: string) => ch.toUpperCase())
    .replace(/^[a-z]/, (c) => c.toUpperCase());
}

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
interface JsonObject {
  [key: string]: JsonValue;
}

interface InterfaceDef {
  name: string;
  body: string;
}

// coerce a candidate name into a valid TS identifier, then make it unique so
// keys that collide after PascalCase (e.g. my_data and myData) don't emit two
// interfaces with the same name
function uniqueIdentifier(name: string, used: Set<string>): string {
  let base = name.replace(/[^A-Za-z0-9$]/g, '').replace(/^[0-9]/, '_$&');
  if (base.length === 0) base = 'Anon';
  let candidate = base;
  let n = 2;
  while (used.has(candidate)) {
    candidate = `${base}${n}`;
    n++;
  }
  used.add(candidate);
  return candidate;
}

// infers the TypeScript type string for a JSON value, collecting nested interface definitions
function inferType(
  value: JsonValue,
  name: string,
  defs: InterfaceDef[],
  used: Set<string>,
): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';

  if (Array.isArray(value)) {
    if (value.length === 0) return 'unknown[]';
    const elementType = inferType(value[0], `${name}Item`, defs, used);
    return `${elementType}[]`;
  }

  // object — emit a named interface with a guaranteed-unique, valid identifier
  const ifaceName = uniqueIdentifier(name, used);
  const lines: string[] = [];

  for (const key of Object.keys(value as JsonObject)) {
    const fieldValue = (value as JsonObject)[key];
    const fieldTypeName = toPascalCase(key);
    const fieldType = inferType(fieldValue, fieldTypeName, defs, used);
    const formattedKey = needsQuoting(key) ? `'${key}'` : key;
    lines.push(`  ${formattedKey}: ${fieldType};`);
  }

  defs.push({ name: ifaceName, body: lines.join('\n') });
  return ifaceName;
}

// generates all TypeScript interface declarations from a parsed JSON object
function generateInterfaces(parsed: JsonValue): string {
  const defs: InterfaceDef[] = [];
  inferType(parsed, 'Root', defs, new Set<string>());

  // emit nested interfaces before the root so references are declared first
  return defs.map((d) => `interface ${d.name} {\n${d.body}\n}`).join('\n\n');
}

export const JsonToTypescriptBoxSource = {
  defaultDisabled: true,
  name: 'JSON to TypeScript',
  description: 'Generate a TypeScript interface from a JSON sample.',
  defaultInput:
    '{"id":1,"name":"Bob","tags":["a"],"meta":{"ok":true}} ::tsinterface',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'tsinterface', 'jsontots')) return [];
    if (input.length > MAX_INPUT) return [];

    const trimmed = trim(input);

    let parsed: JsonValue;
    try {
      parsed = JSON.parse(trimmed) as JsonValue;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return [
        new BoxBuilder(
          'JSON to TypeScript',
          `// invalid JSON — cannot generate TypeScript interface\n// ${message}`,
        )
          .setTemplate(CodeBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const output = generateInterfaces(parsed);
    return [
      new BoxBuilder('JSON to TypeScript', output)
        .setTemplate(CodeBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default JsonToTypescriptBoxSource;
