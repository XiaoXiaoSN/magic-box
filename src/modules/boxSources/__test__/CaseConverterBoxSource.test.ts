import { CaseConverterBoxSource } from '@modules/boxSources/CaseConverterBoxSource';
import { describe, expect, it } from 'vitest';

describe('CaseConverterBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when ::case option is absent', async () => {
      const boxes = await CaseConverterBoxSource.generateBoxes(
        'hello world',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input even with ::case option', async () => {
      const boxes = await CaseConverterBoxSource.generateBoxes('   ', {
        case: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for whitespace-only input', async () => {
      const boxes = await CaseConverterBoxSource.generateBoxes('', {
        case: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('converts multi-word space-separated input to all cases', async () => {
      const boxes = await CaseConverterBoxSource.generateBoxes('hello world', {
        case: true,
      });

      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;

      expect(opts.camelCase).toBe('helloWorld');
      expect(opts.PascalCase).toBe('HelloWorld');
      expect(opts.snake_case).toBe('hello_world');
      expect(opts['kebab-case']).toBe('hello-world');
      expect(opts.CONSTANT_CASE).toBe('HELLO_WORLD');
      expect(opts['dot.case']).toBe('hello.world');
      expect(opts['Title Case']).toBe('Hello World');
      expect(opts['Sentence case']).toBe('Hello world');
      expect(opts.lowercase).toBe('hello world');
      expect(opts.UPPERCASE).toBe('HELLO WORLD');
    });

    it('tokenizes camelCase input correctly', async () => {
      const boxes = await CaseConverterBoxSource.generateBoxes('fooBarBaz', {
        case: true,
      });

      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;

      expect(opts.camelCase).toBe('fooBarBaz');
      expect(opts.PascalCase).toBe('FooBarBaz');
      expect(opts.snake_case).toBe('foo_bar_baz');
      expect(opts['kebab-case']).toBe('foo-bar-baz');
      expect(opts.CONSTANT_CASE).toBe('FOO_BAR_BAZ');
      expect(opts['dot.case']).toBe('foo.bar.baz');
      expect(opts['Title Case']).toBe('Foo Bar Baz');
      expect(opts['Sentence case']).toBe('Foo bar baz');
    });

    it('tokenizes mixed separators (hyphens and underscores)', async () => {
      const boxes = await CaseConverterBoxSource.generateBoxes(
        'hello-world_foo',
        { case: true },
      );

      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;

      expect(opts.snake_case).toBe('hello_world_foo');
      expect(opts['kebab-case']).toBe('hello-world-foo');
      expect(opts.CONSTANT_CASE).toBe('HELLO_WORLD_FOO');
    });

    it('splits acronym boundaries (XMLParser, myHTTPSClient)', async () => {
      const xml = await CaseConverterBoxSource.generateBoxes('XMLParser', {
        case: true,
      });
      expect((xml[0].props.options as Record<string, string>).camelCase).toBe(
        'xmlParser',
      );

      const https = await CaseConverterBoxSource.generateBoxes(
        'myHTTPSClient',
        {
          case: true,
        },
      );
      expect((https[0].props.options as Record<string, string>).camelCase).toBe(
        'myHttpsClient',
      );
    });

    it('tokenizes a long uppercase run in linear time (ReDoS guard)', async () => {
      // the old /([A-Z]+)([A-Z][a-z])/g regex took ~7s on 100k uppercase chars;
      // the lookahead form is linear, so this resolves well under the test timeout
      const boxes = await CaseConverterBoxSource.generateBoxes(
        `${'A'.repeat(100_000)}b`,
        { case: true },
      );
      expect(boxes).toHaveLength(1);
    });

    it('plaintextOutput lists all conversions as key: value lines', async () => {
      const boxes = await CaseConverterBoxSource.generateBoxes('hello world', {
        case: true,
      });

      const text = boxes[0].props.plaintextOutput;
      expect(text).toContain('camelCase: helloWorld');
      expect(text).toContain('PascalCase: HelloWorld');
      expect(text).toContain('snake_case: hello_world');
      expect(text).toContain('kebab-case: hello-world');
      expect(text).toContain('CONSTANT_CASE: HELLO_WORLD');
      expect(text).toContain('dot.case: hello.world');
      expect(text).toContain('Title Case: Hello World');
      expect(text).toContain('Sentence case: Hello world');
      expect(text).toContain('lowercase: hello world');
      expect(text).toContain('UPPERCASE: HELLO WORLD');
    });
  });

  describe('format selection', () => {
    const run = (options: Record<string, string | boolean>) =>
      CaseConverterBoxSource.generateBoxes('helloWorld fooBar', options);

    it.each([
      ['camel', 'camelCase', 'helloWorldFooBar'],
      ['camelcase', 'camelCase', 'helloWorldFooBar'],
      ['pascal', 'PascalCase', 'HelloWorldFooBar'],
      ['snake', 'snake_case', 'hello_world_foo_bar'],
      ['kebab', 'kebab-case', 'hello-world-foo-bar'],
      ['constant', 'CONSTANT_CASE', 'HELLO_WORLD_FOO_BAR'],
      ['dot', 'dot.case', 'hello.world.foo.bar'],
      ['title', 'Title Case', 'Hello World Foo Bar'],
      ['sentence', 'Sentence case', 'Hello world foo bar'],
      ['lower', 'lowercase', 'helloworld foobar'],
      ['upper', 'UPPERCASE', 'HELLOWORLD FOOBAR'],
      ['uppercase', 'UPPERCASE', 'HELLOWORLD FOOBAR'],
    ])('::%s shows only %s', async (key, label, value) => {
      const boxes = await run({ [key]: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe(label);
      expect(boxes[0].props.plaintextOutput).toBe(value);
    });

    it.each([
      ['camel'],
      ['camelCase'],
      ['CAMEL'],
      ['camel-case'],
    ])('::case=%s selects camelCase', async (value) => {
      const boxes = await run({ case: value });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('camelCase');
      expect(boxes[0].props.plaintextOutput).toBe('helloWorldFooBar');
    });

    it('accepts a format label as written, e.g. ::case=snake_case', async () => {
      const boxes = await run({ case: 'snake_case' });
      expect(boxes[0].props.plaintextOutput).toBe('hello_world_foo_bar');
    });

    it('combines ::case=<format> with single-format keys in table order', async () => {
      const boxes = await run({ case: 'upper', snake: true });
      expect(boxes.map((b) => b.props.name)).toEqual([
        'snake_case',
        'UPPERCASE',
      ]);
    });

    it('lets a single-format key narrow a bare ::case', async () => {
      const boxes = await run({ case: true, kebab: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('kebab-case');
    });

    it('reports an unknown ::case value instead of guessing', async () => {
      const boxes = await run({ case: 'spongebob' });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Case Converter');
      expect(boxes[0].props.plaintextOutput).toContain(
        'Unknown case "spongebob"',
      );
      expect(boxes[0].props.plaintextOutput).toContain('camel');
    });

    it('keeps line breaks and punctuation for ::upper and ::lower', async () => {
      const upper = await CaseConverterBoxSource.generateBoxes(
        'Hello, World!\nsecond line',
        { upper: true },
      );
      expect(upper[0].props.plaintextOutput).toBe('HELLO, WORLD!\nSECOND LINE');

      const lower = await CaseConverterBoxSource.generateBoxes('ÄÖÜ Straße', {
        lower: true,
      });
      expect(lower[0].props.plaintextOutput).toBe('äöü straße');
    });
  });
});
