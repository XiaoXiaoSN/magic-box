import { parseInput, parseOptionsForChips } from '@functions/parseOptions';
import { describe, expect, it } from 'vitest';

import { CsvBoxSource } from '../CsvBoxSource';
import { DataConverterBoxSource } from '../DataConverterBoxSource';

async function run(raw: string) {
  const [input, options] = parseInput(raw);
  const results = await Promise.all([
    CsvBoxSource.generateBoxes(input, options),
    DataConverterBoxSource.generateBoxes(input, options),
  ]);
  return results.flat();
}

describe('CSV review regressions from raw input', () => {
  it('rejects extreme rectangular expansion before allocation', async () => {
    const raw = `id,v\n${'1,2\n'.repeat(20_000)}${Array<string>(20_000).fill('x').join(',')}`;
    const [input, options] = parseInput(raw);
    expect(await CsvBoxSource.generateBoxes(input, options)).toEqual([]);
    const [explicit, explicitOptions] = parseInput(`${raw}\n::json`);
    const boxes = await CsvBoxSource.generateBoxes(explicit, explicitOptions);
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.isError).toBe(true);
    expect(boxes[0].props.plaintextOutput).toMatch(/cell limit/);
  });

  it('pads a ragged TSV on the right without shifting its header', async () => {
    const boxes = await run('name\tage\nAlice\t30\tTW\n::col=name');
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.plaintextOutput).toBe('Alice');
    const headerless = await run(
      'name\tage\nAlice\t30\tTW\n::noheader\n::json',
    );
    expect(JSON.parse(headerless[0].props.plaintextOutput)).toEqual([
      ['name', 'age', ''],
      ['Alice', '30', 'TW'],
    ]);
  });

  it('preserves multiple empty boundary TSV cells', async () => {
    const boxes = await run('\t\tQ1\tQ2\nNorth\tRegion\t10\t\n::json');
    expect(boxes).toHaveLength(1);
    expect(JSON.parse(boxes[0].props.plaintextOutput)).toEqual([
      { column_1: 'North', column_2: 'Region', Q1: '10', Q2: '' },
    ]);
  });

  it.each([
    ['name|age\nAlice|30\n::sep=|\n::json', { name: 'Alice', age: '30' }],
    ['[{"name":"Alice","private":"x"}]\n::col=name\n::json', { name: 'Alice' }],
  ])('gives CSV sole ownership of selected JSON: %s', async (raw, expected) => {
    const boxes = await run(raw);
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.isError).not.toBe(true);
    expect(JSON.parse(boxes[0].props.plaintextOutput)).toEqual([expected]);
  });

  it('keeps normal JSON with Data Converter and still answers YAML', async () => {
    const plain = await run('[{"name":"Alice"}]\n::json');
    expect(plain.map((box) => box.props.name)).toEqual(['JSON Output']);
    const mixed = await run(
      '[{"name":"Alice","private":"x"}]\n::col=name\n::json\n::yaml',
    );
    expect(mixed.map((box) => box.props.name)).toEqual(['JSON', 'YAML Output']);
    const unsupported = await run(
      'name|age\nAlice|30\n::sep=|\n::json\n::yaml',
    );
    expect(unsupported).toHaveLength(2);
    expect(unsupported[1].props.isError).toBe(true);
  });

  it.each([
    ',',
    ';',
    '\t',
    '|',
  ])('keeps quoted directives as data with %j', async (sep) => {
    const raw = `id${sep}note\n1${sep}"before\n::md\n::sep=;\nsay ""hi""\nafter"\n::json\n::sep=${sep === '\t' ? 'tab' : sep}`;
    const boxes = await run(raw);
    expect(boxes).toHaveLength(1);
    expect(JSON.parse(boxes[0].props.plaintextOutput)).toEqual([
      { id: '1', note: 'before\n::md\n::sep=;\nsay "hi"\nafter' },
    ]);
    expect(parseOptionsForChips(raw)).not.toHaveProperty('md');
  });

  it('accepts a directive after a quoted field closes', async () => {
    const boxes = await run('id,note\n1,"before\nafter"\n::md\n::json');
    expect(boxes.map((box) => box.props.name)).toEqual([
      'CSV → Markdown',
      'CSV → JSON',
    ]);
  });

  it('keeps ordinary prose directive semantics', () => {
    expect(parseInput('say "before\n::md\nafter"')).toEqual([
      'say "before\nafter"',
      { md: true },
    ]);
  });

  it.each([
    'constructor',
    '__proto__',
    'ab',
  ])('reports invalid delimiter %s', async (value) => {
    const [input, options] = parseInput(`a,b\n1,2\n::sep=${value}`);
    const boxes = await CsvBoxSource.generateBoxes(input, options);
    expect(boxes[0].props.isError).toBe(true);
    expect(boxes[0].props.plaintextOutput).toMatch(
      /Give one delimiter character/,
    );
  });

  it('selects a header that resembles an exponent', async () => {
    const boxes = await run('E1,E2\n10,20\n::col=E1');
    expect(boxes[0].props.plaintextOutput).toBe('10');
  });
});
