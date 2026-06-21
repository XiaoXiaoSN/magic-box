import { CodeBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// python reserved words that can't be used as bare field names
const PY_KEYWORDS = new Set([
  'False',
  'None',
  'True',
  'and',
  'as',
  'assert',
  'async',
  'await',
  'break',
  'class',
  'continue',
  'def',
  'del',
  'elif',
  'else',
  'except',
  'finally',
  'for',
  'from',
  'global',
  'if',
  'import',
  'in',
  'is',
  'lambda',
  'nonlocal',
  'not',
  'or',
  'pass',
  'raise',
  'return',
  'try',
  'while',
  'with',
  'yield',
]);

// maps a json key to a valid python identifier: non-identifier chars → '_',
// digit-leading names get a prefix, reserved words get a trailing underscore
function safePyName(key: string): string {
  const id = key.replace(/[^a-zA-Z0-9_]/g, '_');
  if (/^\d/.test(id)) return `f_${id}`;
  if (PY_KEYWORDS.has(id)) return `${id}_`;
  return id || '_';
}

// maps a json key to a safe PascalCase class name, de-duplicating against usedNames
function toPascalCase(key: string): string {
  // replace non-alphanumeric chars with spaces, then capitalise each word
  return key
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

function uniqueName(base: string, used: Set<string>): string {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let counter = 2;
  while (used.has(`${base}${counter}`)) {
    counter++;
  }
  const name = `${base}${counter}`;
  used.add(name);
  return name;
}

interface ClassDef {
  name: string;
  fields: string[];
}

// resolves a json value to a python type string, collecting nested class definitions
function resolveType(
  value: unknown,
  key: string,
  classes: ClassDef[],
  usedNames: Set<string>,
  imports: Set<string>,
): string {
  if (value === null) {
    imports.add('Optional');
    imports.add('Any');
    return 'Optional[Any]';
  }
  if (typeof value === 'boolean') {
    return 'bool';
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'int' : 'float';
  }
  if (typeof value === 'string') {
    return 'str';
  }
  if (Array.isArray(value)) {
    imports.add('List');
    if (value.length === 0) {
      imports.add('Any');
      return 'List[Any]';
    }
    const elemType = resolveType(
      value[0],
      `${key}Item`,
      classes,
      usedNames,
      imports,
    );
    return `List[${elemType}]`;
  }
  if (typeof value === 'object') {
    const className = uniqueName(toPascalCase(key) || 'Nested', usedNames);
    buildClass(
      value as Record<string, unknown>,
      className,
      classes,
      usedNames,
      imports,
    );
    return className;
  }
  imports.add('Any');
  return 'Any';
}

// builds a ClassDef for an object and pushes nested classes before itself
function buildClass(
  obj: Record<string, unknown>,
  className: string,
  classes: ClassDef[],
  usedNames: Set<string>,
  imports: Set<string>,
): void {
  const fields: string[] = [];
  for (const [key, val] of Object.entries(obj)) {
    const pyType = resolveType(val, key, classes, usedNames, imports);
    fields.push(`    ${safePyName(key)}: ${pyType}`);
  }
  // push after nested classes so definitions always appear before their references
  classes.push({ name: className, fields });
}

function generatePythonDataclasses(json: unknown): string {
  if (json === null || Array.isArray(json) || typeof json !== 'object') {
    throw new Error('Root JSON value must be an object');
  }

  const classes: ClassDef[] = [];
  const usedNames = new Set<string>();
  const imports = new Set<string>();

  // reserve 'Root' so nested keys can't collide with it
  usedNames.add('Root');
  buildClass(
    json as Record<string, unknown>,
    'Root',
    classes,
    usedNames,
    imports,
  );

  // build import line — only include what was actually used
  const typingImports: string[] = [];
  for (const name of ['List', 'Any', 'Optional']) {
    if (imports.has(name)) typingImports.push(name);
  }

  const lines: string[] = ['from dataclasses import dataclass'];
  if (typingImports.length > 0) {
    lines.push(`from typing import ${typingImports.join(', ')}`);
  }

  for (const cls of classes) {
    lines.push('');
    lines.push('');
    lines.push('@dataclass');
    lines.push(`class ${cls.name}:`);
    if (cls.fields.length === 0) {
      lines.push('    pass');
    } else {
      for (const f of cls.fields) {
        lines.push(f);
      }
    }
  }

  return lines.join('\n');
}

export const JsonToPythonBoxSource = {
  name: 'JSON to Python',
  description: 'Generate Python @dataclass definitions from a JSON sample.',
  defaultInput: '{"id":1,"name":"Bob","tags":["a"]} ::pydataclass',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'pydataclass', 'jsontopython')) return [];
    if (input.length > MAX_INPUT) return [];

    const trimmed = trim(input);
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      const errorBox = new BoxBuilder(
        'JSON to Python',
        'Error: invalid JSON — could not parse input.',
      )
        .setTemplate(CodeBoxTemplate)
        .setOptions({ language: 'python' })
        .setPriority(this.priority)
        .build();
      return [errorBox];
    }

    let output: string;
    try {
      output = generatePythonDataclasses(parsed);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const errorBox = new BoxBuilder('JSON to Python', `Error: ${msg}`)
        .setTemplate(CodeBoxTemplate)
        .setOptions({ language: 'python' })
        .setPriority(this.priority)
        .build();
      return [errorBox];
    }

    const box = new BoxBuilder('JSON to Python', output)
      .setTemplate(CodeBoxTemplate)
      .setOptions({ language: 'python' })
      .setPriority(this.priority)
      .build();

    return [box];
  },
};

export default JsonToPythonBoxSource;
