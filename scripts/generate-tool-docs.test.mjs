import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript-docs';
import { optionKeys } from './generate-tool-docs.mjs';

const parse = (text, filename = 'fixture.ts') =>
  ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true);

test('reads helper aliases, direct options, spreads and both conditional branches', () => {
  const file = parse(`
    const KEYS = ['first', 'second'] as const;
    function run(options) {
      const operation = options.lighten ? 'lighten' : 'darken';
      hasOptionKeys(options, ...KEYS, 'alias');
      extractOptionKeys(options, operation);
      return options?.uppercase;
    }
  `);
  assert.deepEqual(optionKeys(file), [
    'alias',
    'darken',
    'first',
    'lighten',
    'second',
    'uppercase',
  ]);
});

test('collects every algorithm key without treating labels as options', () => {
  const file = parse(`
    const FORMATS = [
      { label: 'One', keys: ['one', '1'] },
      { label: 'Two', keys: ['two', '2'] },
    ];
    const KEYS = FORMATS.flatMap((format) => format.keys);
    hasOptionKeys(options, ...KEYS);
    FORMATS.filter((format) => hasOptionKeys(options, ...format.keys));
  `);
  assert.deepEqual(optionKeys(file), ['1', '2', 'one', 'two']);
});

test('collects computed option access in a for-of loop', () => {
  assert.deepEqual(
    optionKeys(
      parse(`
    const KEYS = ['hmac', 'sha256'];
    for (const key of KEYS) { const value = options[key]; }
  `),
    ),
    ['hmac', 'sha256'],
  );
});

test('resolves imported routing keys and format arrays in the real converter', () => {
  const filename = fileURLToPath(
    new URL(
      '../src/modules/boxSources/DataConverterBoxSource.ts',
      import.meta.url,
    ),
  );
  const keys = optionKeys(parse(readFileSync(filename, 'utf8'), filename));
  for (const key of ['json', 'toyaml', 'toyml', 'jsonpointer', 'fromjsonl'])
    assert.ok(keys.includes(key), key);
  assert.ok(!keys.includes('JSON'));
});

test('fails on unresolved option expressions rather than generating incomplete docs', () => {
  assert.throws(
    () => optionKeys(parse('hasOptionKeys(options, ...getKeys());')),
    /Unsupported documentation expression/,
  );
});
