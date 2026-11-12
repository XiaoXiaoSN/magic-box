import { parseInput } from '@functions/parseOptions';
import { describe, expect, it } from 'vitest';

import { CsvBoxSource } from '../CsvBoxSource';

const run = (raw: string) => {
  const [input, options] = parseInput(raw);
  return CsvBoxSource.generateBoxes(input, options);
};

const names = async (raw: string) =>
  (await run(raw)).map((box) => box.props.name);

const output = async (raw: string, name: string) =>
  (await run(raw)).find((box) => box.props.name === name)?.props
    .plaintextOutput;

describe('CsvBoxSource', () => {
  describe('automatic detection', () => {
    it('turns a pasted CSV into Markdown and JSON without any option', async () => {
      const boxes = await run('name,age\nAlice,30\nBob,25');
      expect(boxes.map((box) => box.props.name)).toEqual([
        'CSV → Markdown',
        'CSV → JSON',
      ]);
      expect(boxes.every((box) => box.view === 'code')).toBe(true);
      expect(boxes[0].props.options).toEqual({ language: 'text' });
      expect(boxes[1].props.options).toEqual({ language: 'json' });
      expect(JSON.parse(boxes[1].props.plaintextOutput)).toEqual([
        { name: 'Alice', age: '30' },
        { name: 'Bob', age: '25' },
      ]);
    });

    it('names what it detected in the box title', async () => {
      expect(await names('a\tb\n1\t2')).toEqual([
        'TSV → Markdown',
        'TSV → JSON',
      ]);
      expect(await names('a;b\n1;2')).toEqual([
        'CSV (;) → Markdown',
        'CSV (;) → JSON',
      ]);
    });

    it('rebuilds a spreadsheet copy whose top-left cell was empty', async () => {
      // the leading tab of `\tQ1\tQ2` is lost to input trimming
      const json = await output('\tQ1\tQ2\nNorth\t10\t20', 'TSV → JSON');
      expect(JSON.parse(json ?? '')).toEqual([
        { column_1: 'North', Q1: '10', Q2: '20' },
      ]);
    });

    it.each([
      'Hello, world\nGoodbye, moon',
      '1,2,3\n4,5,6',
      'f(a,b)\ng(c,d)',
      '{"a":1,"b":2}\n{"a":3,"b":4}',
      'name,age',
    ])('stays silent on %j', async (raw) => {
      expect(await run(raw)).toEqual([]);
    });

    it('answers a shared ::json with only the JSON box', async () => {
      expect(await names('name,age\nAlice,30\n::json')).toEqual(['CSV → JSON']);
      expect(await names('name,age\nAlice,30\n::tojson')).toEqual([
        'CSV → JSON',
      ]);
    });

    it('does not read ::json on non-table text as a table', async () => {
      expect(await run('apple\nbanana\n::json')).toEqual([]);
      expect(await run('[{"a":1}]\n::json')).toEqual([]);
    });

    it('stays silent instead of reporting a broken guess', async () => {
      expect(await run('a,b\n1,2\n"open,3')).toEqual([]);
    });
  });

  describe('explicit outputs', () => {
    it('renders only the requested formats, in a stable order', async () => {
      expect(await names('a\tb\n1\t2\n::md\n::csv')).toEqual([
        'TSV → CSV',
        'TSV → Markdown',
      ]);
    });

    it('converts a Markdown table with ::md (PR #351)', async () => {
      expect(
        await output('name,age\nAlice,30\n::markdown', 'CSV → Markdown'),
      ).toBe('| name  | age |\n| ----- | --: |\n| Alice |  30 |');
    });

    it('converts TSV to CSV with quoting', async () => {
      expect(await output('a\tb\nx,y\t"q"\n::csv', 'TSV → CSV')).toBe(
        'a,b\n"x,y",q',
      );
    });

    it('names a same-format output by the format alone', async () => {
      expect(await names('a,b\n1,2\n::csv')).toEqual(['CSV']);
    });

    it('reads a table that automatic detection refuses', async () => {
      // ragged and with ", " style: too doubtful to guess, fine when asked
      const markdown = await output(
        'name, age\nAlice, 30\nBob\n::md',
        'CSV → Markdown',
      );
      expect(markdown).toBe(
        '| name  | age |\n| ----- | --: |\n| Alice |  30 |\n| Bob   |     |',
      );
    });

    it('keeps a one-column list as a one-column table', async () => {
      expect(await output('apple\nbanana\n::md', 'CSV → Markdown')).toBe(
        '| apple  |\n| ------ |\n| banana |',
      );
    });

    it('keeps embedded line breaks in one row (PR #350)', async () => {
      const json = await output('name,note\n"a\nb",x\n::json', 'CSV → JSON');
      expect(JSON.parse(json ?? '')).toEqual([{ name: 'a\nb', note: 'x' }]);
    });
  });

  describe('JSON input', () => {
    it('converts an array of objects to CSV with ::csv (PR #350)', async () => {
      expect(
        await output('[{"a":1,"b":2},{"a":3,"b":4}]\n::csv', 'JSON → CSV'),
      ).toBe('a,b\n1,2\n3,4');
    });

    it('unions heterogeneous keys and quotes when needed', async () => {
      expect(await output('[{"a":1},{"b":"x,y"}]\n::csv', 'JSON → CSV')).toBe(
        'a,b\n1,\n,"x,y"',
      );
    });

    it('writes nested values as JSON instead of [object Object]', async () => {
      expect(await output('[{"a":{"b":1}}]\n::csv', 'JSON → CSV')).toBe(
        'a\n"{""b"":1}"',
      );
    });

    it('renders Markdown and TSV from JSON', async () => {
      expect(await names('[{"a":1}]\n::md\n::tsv')).toEqual([
        'JSON → TSV',
        'JSON → Markdown',
      ]);
    });

    it('defaults to CSV when only a parsing option is given', async () => {
      expect(await names('[["a","b"],[1,2]]\n::header')).toEqual([
        'JSON → CSV',
      ]);
    });

    it('reports invalid JSON', async () => {
      const boxes = await run('[{invalid}]\n::csv');
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.isError).toBe(true);
      expect(boxes[0].props.plaintextOutput).toMatch(/not valid JSON/);
    });

    it('reports JSON that is not a table', async () => {
      const boxes = await run('[1,[2]]\n::csv');
      expect(boxes[0].props.isError).toBe(true);
    });
  });

  describe('::col (PR #349)', () => {
    const csv = 'name,email\nAlice,a@x.com\nBob,b@y.com';

    it('lists one column by header name', async () => {
      expect(await output(`${csv}\n::col=email`, 'Column: email')).toBe(
        'a@x.com\nb@y.com',
      );
    });

    it('lists one column by 1-based position', async () => {
      expect(await output(`${csv}\n::column=1`, 'Column: name')).toBe(
        'Alice\nBob',
      );
    });

    it('unquotes values', async () => {
      expect(
        await output('a,b\n"x,y",2\n"say ""hi""",3\n::col=a', 'Column: a'),
      ).toBe('x,y\nsay "hi"');
    });

    it('keeps several columns in the source format', async () => {
      expect(await output('a\tb\tc\n1\t2\t3\n::col=c,a', 'TSV')).toBe(
        'c\ta\n3\t1',
      );
    });

    it('feeds the picked columns into the requested outputs', async () => {
      const json = await output(`${csv}\n::col=email\n::json`, 'CSV → JSON');
      expect(JSON.parse(json ?? '')).toEqual([
        { email: 'a@x.com' },
        { email: 'b@y.com' },
      ]);
    });

    it('reports a missing column with the available ones', async () => {
      const boxes = await run(`${csv}\n::col=zzz`);
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.isError).toBe(true);
      expect(boxes[0].props.plaintextOutput).toBe(
        'Column "zzz" not found. Columns: name, email',
      );
    });

    it('asks for a column when the option has no value', async () => {
      const boxes = await run(`${csv}\n::col`);
      expect(boxes[0].props.isError).toBe(true);
      expect(boxes[0].props.plaintextOutput).toMatch(/::col=email/);
    });
  });

  describe('parsing options', () => {
    it('uses the ::sep delimiter', async () => {
      expect(await names('x|y\n1|2\n::sep=|')).toEqual([
        'CSV (|) → Markdown',
        'CSV (|) → JSON',
      ]);
      expect(await names('x y\n1 2\n::sep=space\n::csv')).toEqual([
        'CSV (space) → CSV',
      ]);
      expect(await names('x\ty\n1\t2\n::sep=tab\n::csv')).toEqual([
        'TSV → CSV',
      ]);
    });

    it('rejects a delimiter that is not one character', async () => {
      const boxes = await run('a,b\n1,2\n::sep=ab');
      expect(boxes[0].props.isError).toBe(true);
    });

    it('honors the Excel sep= line', async () => {
      expect(await output('sep=;\na;b\n1;2\n::csv', 'CSV (;) → CSV')).toBe(
        'a,b\n1,2',
      );
    });

    it('treats the first row as data with ::noheader', async () => {
      const json = await output(
        'name,age\nAlice,30\n::noheader\n::json',
        'CSV → JSON',
      );
      expect(JSON.parse(json ?? '')).toEqual([
        ['name', 'age'],
        ['Alice', '30'],
      ]);
    });

    it('detects a numeric first row as data and ::header overrides it', async () => {
      const numeric = '2023,2024\n10,20';
      expect(
        JSON.parse(
          (await output(`${numeric}\n::csv\n::json`, 'CSV → JSON')) ?? '',
        ),
      ).toEqual([
        ['2023', '2024'],
        ['10', '20'],
      ]);
      expect(
        JSON.parse(
          (await output(`${numeric}\n::header\n::json`, 'CSV → JSON')) ?? '',
        ),
      ).toEqual([{ '2023': '10', '2024': '20' }]);
    });

    it('refuses ::header together with ::noheader', async () => {
      const boxes = await run('a,b\n1,2\n::header\n::noheader');
      expect(boxes[0].props.isError).toBe(true);
    });
  });

  describe('errors and limits', () => {
    it('reports an unterminated quote with its line', async () => {
      const boxes = await run('a,b\n1,2\n"open,3\n::md');
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.isError).toBe(true);
      expect(boxes[0].props.plaintextOutput).toBe(
        'A quoted field opened on line 3 is never closed.',
      );
    });

    it('returns nothing for an empty explicit input', async () => {
      expect(await run('::md')).toEqual([]);
      expect(await run(',,\n,,\n::md')).toEqual([]);
    });

    it('stays quiet on a lone line, e.g. while typing ::md5 or ::colormix', async () => {
      expect(await run('hello world\n::md')).toEqual([]);
      expect(await run('#ff6347\n::col')).toEqual([]);
    });

    it('converts a table near the explicit limit without a stack overflow', async () => {
      const table = 'a,b\n'.repeat(260_000).slice(0, 1024 * 1024 - 8);
      const boxes = await run(`${table}\n::md`);
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.isError).not.toBe(true);
    });

    it('explains a ::json result that would be too large', async () => {
      const table = 'a,b\n'.repeat(260_000).slice(0, 1024 * 1024 - 8);
      const boxes = await run(`${table}\n::json`);
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.isError).toBe(true);
      expect(boxes[0].props.plaintextOutput).toMatch(/too large/);
    });

    it('refuses an explicit input over the limit', async () => {
      const huge = `${'a,b\n'.repeat(300_000)}::csv`;
      const boxes = await run(huge);
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.isError).toBe(true);
    });

    it('does not guess on a paste over the automatic limit', async () => {
      const large = `name,age\n${'Alice,30\n'.repeat(30_000)}`;
      expect(await run(large)).toEqual([]);
      expect(await names(`${large}::json`)).toEqual(['CSV → JSON']);
    });
  });
});
