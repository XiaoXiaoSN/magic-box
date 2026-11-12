import { parseJson } from '@functions/json/shared';
import { describe, expect, it, vi } from 'vitest';

import {
  CsvError,
  displayWidth,
  jsonKeys,
  selectColumns,
  type Table,
  tableFromJson,
  tableFromRecords,
  toDelimited,
  toJson,
  toMarkdown,
} from '../table';

const people: Table = {
  header: ['name', 'email', 'age'],
  rows: [
    ['Alice', 'a@x.com', '30'],
    ['Bob', 'b@y.com', '5'],
  ],
  width: 3,
};

describe('tableFromRecords', () => {
  it('pads short rows and widens for long ones instead of dropping cells', () => {
    expect(
      tableFromRecords([['a', 'b'], ['1'], ['1', '2', '3']], true),
    ).toEqual({
      header: ['a', 'b', ''],
      rows: [
        ['1', '', ''],
        ['1', '2', '3'],
      ],
      width: 3,
    });
  });

  it('preserves an explicit empty top-left cell', () => {
    const table = tableFromRecords(
      [
        ['', 'Q1', 'Q2'],
        ['North', '10', '20'],
      ],
      true,
    );
    expect(table.header).toEqual(['', 'Q1', 'Q2']);
  });

  it('keeps every record as data without a header', () => {
    const table = tableFromRecords([['1', '2']], false);
    expect(table).toEqual({ header: null, rows: [['1', '2']], width: 2 });
  });
});

describe('tableFromJson', () => {
  const fromJson = (text: string, header = false) =>
    tableFromJson(parseJson(text), header);

  it('unions object keys in first-seen order', () => {
    expect(fromJson('[{"a":1},{"b":2,"a":3}]')).toEqual({
      header: ['a', 'b'],
      rows: [
        ['1', ''],
        ['3', '2'],
      ],
      width: 2,
    });
  });

  it('keeps number lexemes and writes nested values as JSON', () => {
    const table = fromJson(
      '[{"n":1.50,"big":12345678901234567890,"tags":["x"],"o":{"k":null},"z":null,"t":true}]',
    );
    expect(table.rows[0]).toEqual([
      '1.50',
      '12345678901234567890',
      '["x"]',
      '{"k":null}',
      '',
      'true',
    ]);
  });

  it('keeps a __proto__ key as an ordinary column', () => {
    expect(fromJson('[{"__proto__":"x"}]').header).toEqual(['__proto__']);
  });

  it('reads arrays of arrays as rows and scalars as one column', () => {
    expect(fromJson('[["a","b"],[1,2]]').header).toBeNull();
    expect(fromJson('[["a","b"],[1,2]]', true).header).toEqual(['a', 'b']);
    expect(fromJson('["x","y"]').rows).toEqual([['x'], ['y']]);
  });

  it('reads one object as one row', () => {
    expect(fromJson('{"a":1}').rows).toEqual([['1']]);
  });

  it('rejects shapes that are not a table', () => {
    expect(() => fromJson('[]')).toThrow(CsvError);
    expect(() => fromJson('"text"')).toThrow(CsvError);
    expect(() => fromJson('[{"a":1},[1]]')).toThrow(/mixes/);
  });
});

describe('selectColumns', () => {
  it('selects by exact name, case-insensitive name, then 1-based position', () => {
    const picked = selectColumns(people, 'AGE, 1');
    expect(picked.header).toEqual(['age', 'name']);
    expect(picked.rows).toEqual([
      ['30', 'Alice'],
      ['5', 'Bob'],
    ]);
  });

  it('prefers a header literally named like a number over the position', () => {
    const table: Table = { header: ['x', '1'], rows: [['a', 'b']], width: 2 };
    expect(selectColumns(table, '1').rows).toEqual([['b']]);
  });

  it('names the available columns when one is missing', () => {
    expect(() => selectColumns(people, 'zzz')).toThrow(
      'Column "zzz" not found. Columns: name, email, age',
    );
    expect(() => selectColumns(people, '4')).toThrow(/not found/);
    expect(() => selectColumns({ ...people, header: null }, 'name')).toThrow(
      'Column "name" not found. Columns: 1-3',
    );
  });

  it('asks for a column list when none is given', () => {
    expect(() => selectColumns(people, '')).toThrow(/::col=email/);
  });
});

describe('toDelimited', () => {
  it('quotes only fields that need it', () => {
    const table: Table = {
      header: ['a', 'b'],
      rows: [
        ['x,y', 'say "hi"'],
        ['line\nbreak', ' pad'],
        ['tab\there', 'plain'],
      ],
      width: 2,
    };
    expect(toDelimited(table, ',')).toBe(
      'a,b\n"x,y","say ""hi"""\n"line\nbreak"," pad"\ntab\there,plain',
    );
    expect(toDelimited(table, '\t')).toBe(
      'a\tb\nx,y\t"say ""hi"""\n"line\nbreak"\t" pad"\n"tab\there"\tplain',
    );
  });

  it('escapes a delimiter that is special in a regular expression', () => {
    const table: Table = { header: null, rows: [['a|b', 'c']], width: 2 };
    expect(toDelimited(table, '|')).toBe('"a|b"|c');
  });
});

describe('toMarkdown', () => {
  it('pads columns and right-aligns numeric ones', () => {
    expect(toMarkdown(people)).toBe(
      [
        '| name  | email   | age |',
        '| ----- | ------- | --: |',
        '| Alice | a@x.com |  30 |',
        '| Bob   | b@y.com |   5 |',
      ].join('\n'),
    );
  });

  it('aligns CJK text by display width', () => {
    const table: Table = {
      header: ['名稱', 'x'],
      rows: [['蘋果汁', 'y']],
      width: 2,
    };
    expect(toMarkdown(table)).toBe(
      ['| 名稱   | x   |', '| ------ | --- |', '| 蘋果汁 | y   |'].join('\n'),
    );
  });

  it('escapes pipes and turns line breaks into <br>', () => {
    const table: Table = { header: ['a'], rows: [['x|y\nz']], width: 1 };
    // `x\|y<br>z` is nine characters wide
    expect(toMarkdown(table)).toBe(
      `| a${' '.repeat(8)} |\n| ${'-'.repeat(9)} |\n| x\\|y<br>z |`,
    );
  });

  it('gives a headerless table an empty header row', () => {
    const table: Table = { header: null, rows: [['a', 'b']], width: 2 };
    expect(toMarkdown(table)).toBe(
      '|     |     |\n| --- | --- |\n| a   | b   |',
    );
  });

  it('stops padding when one huge cell would bloat a big table', () => {
    const rows = Array.from({ length: 2000 }, (_, i) => [`r${i}`, 'x']);
    rows[0][1] = 'y'.repeat(500);
    const markdown = toMarkdown({ header: ['k', 'v'], rows, width: 2 });
    expect(markdown.split('\n')[1]).toBe('| --- | --- |');
    expect(markdown.split('\n')[3]).toBe('| r1 | x |');
  });
});

describe('toJson', () => {
  it('keys rows by header and keeps values as strings', () => {
    expect(JSON.parse(toJson(people))).toEqual([
      { name: 'Alice', email: 'a@x.com', age: '30' },
      { name: 'Bob', email: 'b@y.com', age: '5' },
    ]);
  });

  it('writes arrays of arrays without a header', () => {
    expect(JSON.parse(toJson({ ...people, header: null }))).toEqual(
      people.rows,
    );
  });
});

describe('jsonKeys', () => {
  it('names empty headers and suffixes repeats', () => {
    expect(jsonKeys(['id', 'id', '', 'id_2', 'id'])).toEqual([
      'id',
      'id_2',
      'column_3',
      'id_2_2',
      'id_3',
    ]);
  });
});

describe('displayWidth', () => {
  it('counts wide, combining and astral characters', () => {
    expect(displayWidth('abc')).toBe(3);
    expect(displayWidth('中文')).toBe(4);
    expect(displayWidth('ｱ')).toBe(1);
    expect(displayWidth('Ａ')).toBe(2);
    expect(displayWidth('é')).toBe(1);
    expect(displayWidth('😀')).toBe(2);
    expect(displayWidth('𠮷')).toBe(2);
  });
});

describe('dense table budgets', () => {
  it('checks rectangular records before reading cells to pad them', () => {
    const rows = [['a', 'b'], ['1'], ['x', 'y', 'z']];
    expect(tableFromRecords(rows, true, 9).width).toBe(3);
    Object.defineProperty(rows[1], 0, {
      get: () => {
        throw new Error('allocated too soon');
      },
    });
    expect(() => tableFromRecords(rows, true, 8)).toThrow(CsvError);
  });

  it('budgets the JSON union of keys including its header', () => {
    const value = parseJson('[{"a":1},{"b":2}]');
    expect(tableFromJson(value, false, 6).rows).toEqual([
      ['1', ''],
      ['', '2'],
    ]);
    expect(() => tableFromJson(value, false, 5)).toThrow(/cell limit/);
    expect(() => tableFromJson(parseJson('[[1],[2,3]]'), false, 3)).toThrow(
      /cell limit/,
    );
  });

  it('budgets repeated selected columns including the header', () => {
    expect(selectColumns(people, '1,1', 6).rows[0]).toEqual(['Alice', 'Alice']);
    expect(() => selectColumns(people, '1,1,1', 6)).toThrow(/cell limit/);
  });
});

it('resolves many duplicate headers with a linear number of key probes', () => {
  const has = vi.spyOn(Set.prototype, 'has');
  const keys = jsonKeys(Array<string>(20_000).fill('h'));
  const probes = has.mock.calls.length;
  has.mockRestore();
  expect(keys[0]).toBe('h');
  expect(keys.at(-1)).toBe('h_20000');
  expect(new Set(keys).size).toBe(20_000);
  expect(probes).toBeLessThan(60_000);
  expect(jsonKeys(['id', 'id', 'id_2', 'id'])).toEqual([
    'id',
    'id_2',
    'id_2_2',
    'id_3',
  ]);
});
