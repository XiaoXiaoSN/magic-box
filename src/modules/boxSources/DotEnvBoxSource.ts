import { CodeBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// strips one layer of surrounding single or double quotes from a value
function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

// parses .env text into a plain string-keyed object
function parseEnv(input: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of input.split('\n')) {
    const trimmed = trim(line);
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trim(trimmed.slice(0, eqIndex));
    const rawValue = trim(trimmed.slice(eqIndex + 1));
    result[key] = stripQuotes(rawValue);
  }
  return result;
}

// serializes a flat object to .env lines, quoting values that need it
function serializeEnv(obj: Record<string, string>): string {
  return Object.entries(obj)
    .map(([key, rawValue]) => {
      const value = String(rawValue);
      // quote values that contain spaces, '#', or '=' to avoid ambiguity
      const needsQuotes = /[ #=]/.test(value);
      if (needsQuotes) {
        const escaped = value.replace(/"/g, '\\"');
        return `${key}="${escaped}"`;
      }
      return `${key}=${value}`;
    })
    .join('\n');
}

export const DotEnvBoxSource = {
  name: 'Dotenv / JSON',
  description:
    'Convert a .env file to a JSON object, or a flat JSON object to .env format.',
  defaultInput: 'API_KEY=abc123\nDEBUG=true ::dotenv',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'dotenv', 'envjson')) return [];
    if (input.length > MAX_INPUT) return [];

    const trimmed = trim(input);

    // detect direction: JSON-looking input goes JSON→env, otherwise env→JSON
    if (trimmed.startsWith('{')) {
      try {
        const obj = JSON.parse(trimmed) as Record<string, unknown>;
        const flat: Record<string, string> = {};
        for (const [k, v] of Object.entries(obj)) {
          flat[k] = String(v);
        }
        const output = serializeEnv(flat);
        return [
          new BoxBuilder('JSON → Dotenv', output)
            .setTemplate(CodeBoxTemplate)
            .setPriority(this.priority)
            .build(),
        ];
      } catch {
        return [
          new BoxBuilder('JSON → Dotenv', 'Error: invalid JSON input')
            .setTemplate(CodeBoxTemplate)
            .setPriority(this.priority)
            .build(),
        ];
      }
    }

    // env→JSON direction
    const obj = parseEnv(trimmed);
    const output = JSON.stringify(obj, null, 2);
    return [
      new BoxBuilder('Dotenv → JSON', output)
        .setTemplate(CodeBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default DotEnvBoxSource;
