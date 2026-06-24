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
    });
  });
});
