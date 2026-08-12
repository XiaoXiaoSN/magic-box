import { CodeBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// keys that must not be set on a plain object to prevent prototype pollution
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function qsToJson(input: string): string {
  const stripped = input.startsWith('?') ? input.slice(1) : input;
  const params = new URLSearchParams(stripped);

  // use Object.create(null) so the result has no inherited prototype
  const obj = Object.create(null) as Record<string, string | string[]>;

  for (const [key, value] of params.entries()) {
    if (FORBIDDEN_KEYS.has(key)) continue;

    const existing = obj[key];
    if (existing === undefined) {
      obj[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      obj[key] = [existing, value];
    }
  }

  return JSON.stringify(obj, null, 2);
}

function jsonToQs(input: string): string {
  const parsed: unknown = JSON.parse(input);

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Input must be a flat JSON object');
  }

  const parts: string[] = [];
  for (const [key, value] of Object.entries(
    parsed as Record<string, unknown>,
  )) {
    const encodedKey = encodeURIComponent(key);
    if (Array.isArray(value)) {
      for (const item of value) {
        parts.push(`${encodedKey}=${encodeURIComponent(String(item))}`);
      }
    } else if (value !== null && typeof value === 'object') {
      // a nested object can't be a query-string value; the contract is flat
      throw new Error('Input must be a flat JSON object');
    } else {
      parts.push(`${encodedKey}=${encodeURIComponent(String(value))}`);
    }
  }

  return parts.join('&');
}

export const QueryStringBoxSource = {
  defaultDisabled: true,
  name: 'Query String',
  description:
    'Convert a URL query string to JSON, or a flat JSON object to a query string.',
  defaultInput: 'a=1&b=2&b=3 ::qs',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'qs', 'querystring')) return [];
    if (!isString(input) || input.length > MAX_INPUT) return [];

    const trimmed = trim(input);

    // json → qs when input looks like a json object
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const output = jsonToQs(trimmed);
        return [
          new BoxBuilder('JSON → Query String', output)
            .setTemplate(CodeBoxTemplate)
            .setShowExpandButton(true)
            .setPriority(this.priority)
            .build(),
        ];
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return [
          new BoxBuilder('JSON → Query String (error)', message)
            .setTemplate(CodeBoxTemplate)
            .setShowExpandButton(false)
            .setPriority(this.priority)
            .build(),
        ];
      }
    }

    // qs → json
    try {
      const output = qsToJson(trimmed);
      return [
        new BoxBuilder('Query String → JSON', output)
          .setTemplate(CodeBoxTemplate)
          .setShowExpandButton(true)
          .setPriority(this.priority)
          .build(),
      ];
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return [
        new BoxBuilder('Query String → JSON (error)', message)
          .setTemplate(CodeBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }
  },
};

export default QueryStringBoxSource;
