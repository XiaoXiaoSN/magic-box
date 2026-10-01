import { describe, expect, it } from 'vitest';

import { omitKeys, parseKeyList, pickKeys } from '../pickOmit';

describe('parseKeyList', () => {
  it('splits on commas, trims and drops empty entries', () => {
    expect(parseKeyList(' a, b,,c ,')).toEqual(['a', 'b', 'c']);
  });

  it('keeps dotted names literal (no path syntax)', () => {
    expect(parseKeyList('a.b')).toEqual(['a.b']);
  });
});

describe('pickKeys', () => {
  it('keeps listed keys in the source key order', () => {
    expect(JSON.stringify(pickKeys({ a: 1, b: 2, c: 3 }, ['c', 'a']))).toBe(
      '{"a":1,"c":3}',
    );
  });

  it('skips listed keys that are absent', () => {
    expect(JSON.stringify(pickKeys({ a: 1 }, ['a', 'z']))).toBe('{"a":1}');
  });

  it('never reads inherited members', () => {
    expect(
      JSON.stringify(pickKeys({ a: 1 }, ['constructor', 'toString'])),
    ).toBe('{}');
  });

  it('keeps special-looking keys that exist as data', () => {
    const src = JSON.parse('{"__proto__":{"x":1},"constructor":"c","a":1}');
    expect(JSON.stringify(pickKeys(src, ['__proto__', 'constructor']))).toBe(
      '{"__proto__":{"x":1},"constructor":"c"}',
    );
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });
});

describe('omitKeys', () => {
  it('drops listed keys and keeps the rest', () => {
    expect(JSON.stringify(omitKeys({ a: 1, b: 2, c: 3 }, ['b']))).toBe(
      '{"a":1,"c":3}',
    );
  });

  it('keeps special-looking keys that were not listed', () => {
    const src = JSON.parse('{"constructor":"data","__proto__":1,"a":1}');
    expect(JSON.stringify(omitKeys(src, ['a']))).toBe(
      '{"constructor":"data","__proto__":1}',
    );
  });
});
