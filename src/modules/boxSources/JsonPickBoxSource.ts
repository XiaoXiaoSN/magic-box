import { CodeBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;
// keys that must never be read or written to prevent prototype pollution
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export const JsonPickBoxSource = {
  name: 'JSON Pick',
  description:
    'Pick or omit top-level keys from a JSON object. ::jsonpick=a,b or ::jsonomit=a,b.',
  defaultInput: '{"a":1,"b":2,"c":3} ::jsonpick=a,c',
  tag: '#',
  kind: 'Transform',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const pick = extractOptionKeys(options, 'jsonpick');
    const omit = extractOptionKeys(options, 'jsonomit');

    if (pick === null && omit === null) return [];
    if (input.length > MAX_INPUT) return [];

    // show usage only when NEITHER flag carries a usable key list — a bare
    // ::jsonomit alongside ::jsonpick=a,b must not suppress the pick
    if (typeof pick !== 'string' && typeof omit !== 'string') {
      const flag = pick === true ? '::jsonpick' : '::jsonomit';
      return [
        new BoxBuilder(
          'JSON Pick',
          `Usage: provide a comma-separated key list, e.g. ${flag}=a,b,c`,
        )
          .setTemplate(CodeBoxTemplate)
          .setOptions({ language: 'json' })
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // parse input as a JSON object
    let parsed: unknown;
    try {
      parsed = JSON.parse(trim(input));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return [
        new BoxBuilder('JSON Pick', `JSON parse error: ${msg}`)
          .setTemplate(CodeBoxTemplate)
          .setOptions({ language: 'json' })
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    if (
      parsed === null ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
      return [
        new BoxBuilder(
          'JSON Pick',
          'Input must be a JSON object (not an array or scalar).',
        )
          .setTemplate(CodeBoxTemplate)
          .setOptions({ language: 'json' })
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const source = parsed as Record<string, unknown>;
    const result: Record<string, unknown> = Object.create(null);

    if (typeof pick === 'string') {
      // pick mode: include only listed keys that exist as own enumerable properties,
      // using the original object's key order for determinism
      const requested = new Set(
        pick
          .split(',')
          .map((k) => k.trim())
          .filter((k) => k.length > 0 && !FORBIDDEN_KEYS.has(k)),
      );
      for (const key of Object.keys(source)) {
        if (
          requested.has(key) &&
          Object.hasOwn(source, key) &&
          !FORBIDDEN_KEYS.has(key)
        ) {
          result[key] = source[key];
        }
      }
    } else if (typeof omit === 'string') {
      // omit mode: include all own keys except the listed ones
      const excluded = new Set(
        omit
          .split(',')
          .map((k) => k.trim())
          .filter((k) => k.length > 0),
      );
      for (const key of Object.keys(source)) {
        if (
          !excluded.has(key) &&
          Object.hasOwn(source, key) &&
          !FORBIDDEN_KEYS.has(key)
        ) {
          result[key] = source[key];
        }
      }
    }

    // convert to a plain object so JSON.stringify uses the normal prototype
    const output = JSON.stringify(Object.assign({}, result), null, 2);

    return [
      new BoxBuilder('JSON Pick', output)
        .setTemplate(CodeBoxTemplate)
        .setOptions({ language: 'json' })
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default JsonPickBoxSource;
