import { CodeBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// keys that must never be set on parsed objects to prevent prototype pollution
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** parses an INI string into a plain object with optional top-level and section keys */
function parseIni(input: string): Record<string, unknown> {
  const root = Object.create(null) as Record<string, unknown>;
  let current: Record<string, unknown> = root;

  for (const rawLine of input.split('\n')) {
    const line = rawLine.trim();

    // skip blank lines and comments
    if (!line || line.startsWith(';') || line.startsWith('#')) continue;

    // section header
    if (line.startsWith('[') && line.endsWith(']')) {
      const section = line.slice(1, -1).trim();
      if (FORBIDDEN_KEYS.has(section)) continue;
      const sectionObj = Object.create(null) as Record<string, unknown>;
      root[section] = sectionObj;
      current = sectionObj;
      continue;
    }

    // key = value
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;

    const key = line.slice(0, eqIdx).trim();
    if (FORBIDDEN_KEYS.has(key)) continue;

    let value = line.slice(eqIdx + 1).trim();
    // strip one layer of surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    current[key] = value;
  }

  return root;
}

/** serialises a plain JSON object to INI format (one level of nesting supported) */
function stringifyIni(obj: Record<string, unknown>): string {
  const lines: string[] = [];

  // top-level scalar values first
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && typeof value !== 'object') {
      lines.push(`${key}=${value}`);
    }
  }

  // nested sections
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      lines.push(`[${key}]`);
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        const serialised =
          v !== null && typeof v === 'object' ? JSON.stringify(v) : String(v);
        lines.push(`${k}=${serialised}`);
      }
    } else if (value !== null && typeof value === 'object') {
      // arrays or deeper nesting — JSON-stringify the value as a scalar
      lines.push(`${key}=${JSON.stringify(value)}`);
    }
  }

  return lines.join('\n');
}

export const IniBoxSource = {
  defaultDisabled: true,
  name: 'INI / JSON',
  description:
    'Convert INI config to JSON, or a flat/sectioned JSON object to INI.',
  defaultInput: '[server]\nhost = localhost\nport = 8080 ::ini',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'ini', 'inijson')) return [];
    if (input.length > MAX_INPUT) return [];

    const trimmed = trim(input);
    if (!trimmed) return [];

    // direction: JSON string → INI, otherwise INI → JSON
    if (trimmed.startsWith('{')) {
      try {
        const obj = JSON.parse(trimmed) as Record<string, unknown>;
        const output = stringifyIni(obj);
        return [
          new BoxBuilder('JSON → INI', output)
            .setOptions({ language: 'ini' })
            .setTemplate(CodeBoxTemplate)
            .setPriority(this.priority)
            .build(),
        ];
      } catch {
        return [
          new BoxBuilder('JSON → INI', 'Error: invalid JSON input')
            .setOptions({ language: 'ini' })
            .setTemplate(CodeBoxTemplate)
            .setPriority(this.priority)
            .build(),
        ];
      }
    }

    // INI → JSON
    try {
      const obj = parseIni(trimmed);
      const output = JSON.stringify(obj, null, 2);
      return [
        new BoxBuilder('INI → JSON', output)
          .setOptions({ language: 'json' })
          .setTemplate(CodeBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    } catch {
      return [
        new BoxBuilder('INI → JSON', 'Error: failed to parse INI input')
          .setOptions({ language: 'json' })
          .setTemplate(CodeBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }
  },
};

export default IniBoxSource;
