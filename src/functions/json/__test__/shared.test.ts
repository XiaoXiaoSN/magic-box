import { describe, expect, it } from 'vitest';

import {
  JsonToolError,
  parseJson,
  parseJsonObject,
  stringifyJson,
} from '../shared';

describe('parseJson', () => {
  const markerZero = '\u0000magic-box-json-key-0';
  const markerOne = '\u0000magic-box-json-key-1';

  it.each([
    String.raw`{"__proto__":1,"\u0000\u006dagic-box-json-key-0":2}`,
    String.raw`{"\u0000\u006Dag\u0069c-box-json-key-\u0030":2,"__proto__":1}`,
  ])('preserves distinct decoded keys in %s', (source) => {
    const parsed = parseJsonObject(source);

    expect(Object.getPrototypeOf(parsed)).toBeNull();
    expect(Object.hasOwn(parsed, '__proto__')).toBe(true);
    expect(parsed.__proto__).toBe(1);
    expect(parsed[markerZero]).toBe(2);
    expect(Object.keys(parsed)).toEqual(Object.keys(JSON.parse(source)));
  });

  it('preserves multiple protected and marker-shaped keys across nested values', () => {
    const source = String.raw`[{"constructor":"root","entries":[{"\u005f_proto__":9007199254740993,"\u0000\u006dagic-box-json-key-0":2,"prototype":{"\u0000magic-box-json-key-\u0031":3,"constructor":1.10}}]}]`;
    const output = String.raw`[{"constructor":"root","entries":[{"__proto__":9007199254740993,"\u0000magic-box-json-key-0":2,"prototype":{"\u0000magic-box-json-key-1":3,"constructor":1.10}}]}]`;

    expect(stringifyJson(parseJson(source))).toBe(output);
  });

  it('still rejects conflicting values for the same decoded key', () => {
    const source = String.raw`{"__proto__":1,"\u0000\u006dagic-box-json-key-0":2,"\u0000magic-box-json-key-0":3}`;

    expect(() => parseJson(source)).toThrow(JsonToolError);
    expect(() => parseJson(source)).toThrow(`Duplicate key '${markerZero}'`);
  });

  it('leaves marker-shaped string values intact', () => {
    const source = String.raw`{"value":"\u0000\u006dagic-box-json-key-1","constructor":"prototype"}`;
    const parsed = parseJsonObject(source);

    expect(parsed.value).toBe(markerOne);
    expect(parsed.constructor).toBe('prototype');
  });
});
