import { parseInput } from '@functions/parseOptions';
import { parse as parseToml, TomlDate } from 'smol-toml';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

import { DataConverterBoxSource } from '../DataConverterBoxSource';

describe('DataConverterBoxSource', () => {
  const jsonInput = '{"name":"John","age":30}';

  describe('generateBoxes', () => {
    it('should convert JSON to YAML, TOML, and XML when requested', async () => {
      const boxes = await DataConverterBoxSource.generateBoxes(jsonInput, {
        yaml: true,
        toml: true,
        xml: true,
        json: true,
      });

      expect(boxes.length).toBeGreaterThanOrEqual(4);

      const names = boxes.map((b) => b.props.name);
      expect(names).toContain('YAML Output');
      expect(names).toContain('TOML Output');
      expect(names).toContain('XML Output');
      expect(names).toContain('JSON Output'); // because input was not pretty

      const yamlBox = boxes.find((b) => b.props.name === 'YAML Output');
      expect(yamlBox?.props.options?.language).toBe('yaml');
      expect(yamlBox?.props.plaintextOutput).toContain('name: John');
      expect(yamlBox?.props.plaintextOutput).toContain('age: 30');

      const xmlBox = boxes.find((b) => b.props.name === 'XML Output');
      expect(xmlBox?.props.options?.language).toBe('xml');
      // fast-xml-parser might wrap in <root> or similar depending on implementation
      expect(xmlBox?.props.plaintextOutput).toContain('<name>John</name>');
    });

    it('should automatically provide pretty-print for source format without options', async () => {
      const boxes = await DataConverterBoxSource.generateBoxes(jsonInput, {});
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('JSON Output');
    });

    it('should convert YAML to JSON, TOML, and XML when requested', async () => {
      const yamlInput = `name: John
age: 30`;
      const boxes = await DataConverterBoxSource.generateBoxes(yamlInput, {
        json: true,
        toml: true,
        xml: true,
      });

      const names = boxes.map((b) => b.props.name);
      expect(names).toContain('JSON Output');
      expect(names).toContain('TOML Output');
      expect(names).toContain('XML Output');

      const jsonBox = boxes.find((b) => b.props.name === 'JSON Output');
      expect(jsonBox?.props.options?.language).toBe('json');
      const parsed = JSON.parse(jsonBox?.props.plaintextOutput ?? '{}');
      expect(parsed.name).toBe('John');
    });

    it('should convert TOML to JSON, YAML, and XML when requested', async () => {
      const tomlInput = `name = "John"
age = 30`;
      const boxes = await DataConverterBoxSource.generateBoxes(tomlInput, {
        json: true,
        yaml: true,
        xml: true,
      });

      const names = boxes.map((b) => b.props.name);
      expect(names).toContain('JSON Output');
      expect(names).toContain('YAML Output');
      expect(names).toContain('XML Output');

      const yamlBox = boxes.find((b) => b.props.name === 'YAML Output');
      expect(yamlBox?.props.plaintextOutput).toContain('name: John');
    });

    it('should convert XML to JSON, YAML, and TOML when requested', async () => {
      const xmlInput = '<person><name>John</name><age>30</age></person>';
      const boxes = await DataConverterBoxSource.generateBoxes(xmlInput, {
        json: true,
        yaml: true,
        toml: true,
      });

      const names = boxes.map((b) => b.props.name);
      expect(names).toContain('JSON Output');
      expect(names).toContain('YAML Output');
      expect(names).toContain('TOML Output');

      const jsonBox = boxes.find((b) => b.props.name === 'JSON Output');
      // Depending on fast-xml-parser settings, it might have a root element
      expect(jsonBox?.props.plaintextOutput).toContain('"name": "John"');
    });

    it('should only show requested format when options are provided', async () => {
      const boxes = await DataConverterBoxSource.generateBoxes(jsonInput, {
        yaml: true,
      });
      const names = boxes.map((b) => b.props.name);
      expect(names).toContain('YAML Output');
      expect(names).not.toContain('TOML Output');
      expect(names).not.toContain('XML Output');
    });

    it('should not show output if input is already pretty and no options provided', async () => {
      const prettyJson = `{
    "name": "John",
    "age": 30
}`;
      const boxes = await DataConverterBoxSource.generateBoxes(prettyJson, {});
      expect(boxes).toHaveLength(0);
    });

    it('should return empty array for invalid input', async () => {
      const boxes = await DataConverterBoxSource.generateBoxes(
        'just a random string',
        {},
      );
      expect(boxes).toHaveLength(0);
    });
  });

  describe('XML documents', () => {
    function parseXml(input: string): Document {
      const document = new DOMParser().parseFromString(
        input,
        'application/xml',
      );
      expect(document.querySelector('parsererror')).toBeNull();
      return document;
    }

    async function xmlOutput(input: string, explicit = true): Promise<string> {
      const [box] = await DataConverterBoxSource.generateBoxes(
        input,
        explicit ? { xml: true } : {},
      );
      expect(box?.props.name).toBe('XML Output');
      return box?.props.plaintextOutput ?? '';
    }

    it('indents XML while keeping interleaved elements in order', async () => {
      const input = '<root><a>1</a><b>2</b><a>3</a></root>';
      const output = await xmlOutput(input, false);
      expect(output).toContain('\n    <b>2</b>\n');

      function orderedContent(document: Document) {
        const root = document.documentElement;
        return [
          root.tagName,
          Array.from(root.children, (child) => [
            child.tagName,
            child.textContent,
          ]),
        ];
      }

      expect(orderedContent(parseXml(output))).toEqual(
        orderedContent(parseXml(input)),
      );
    });

    it.each([
      '<p>Hello <b>world</b> !</p>',
      '<p><b>one</b> <b>two</b></p>',
      '<p>\n <b>one</b>\n <b>two</b> </p>',
      '<p>\n <b><i>one</i><i>two</i></b>\n</p>',
      '<p>Hello <b><i>world</i><i>again</i></b> !</p>',
      '<p xml:space="preserve"><b><i>one</i><i>two</i></b></p>',
    ])('preserves text-node whitespace in %s', async (input) => {
      const output = await xmlOutput(input);
      const expected = parseXml(input).documentElement;
      expect(parseXml(output).documentElement.isEqualNode(expected)).toBe(true);
    });

    it('keeps declarations, processing instructions, CDATA and namespaces', async () => {
      const declaration = '<?xml version="1.0" standalone="yes"?>';
      const input = `${declaration}<?view a > b?><ns:root xmlns:ns="urn:notes" ns:mode=" x > y "><ns:item><![CDATA[<b>]]></ns:item><!-- keep --></ns:root>`;
      const output = await xmlOutput(input, false);
      expect(output).toMatch(/^<\?xml /);
      expect(output).toContain(declaration);
      const expected = parseXml(input);
      const actual = parseXml(output);
      expect(actual.isEqualNode(expected)).toBe(true);
      expect(actual.documentElement.namespaceURI).toBe('urn:notes');
      expect(actual.documentElement.getAttributeNS('urn:notes', 'mode')).toBe(
        ' x > y ',
      );
    });

    it('preserves a doctype and still converts simple internal entities', async () => {
      const input =
        '<!DOCTYPE root [<!ENTITY label "note">]><root>&label;</root>';
      const output = await xmlOutput(input);
      expect(output).toBe(input);
      expect(parseXml(output).documentElement.textContent).toBe('note');
      const [json] = await DataConverterBoxSource.generateBoxes(input, {
        json: true,
      });
      expect(json?.props.name).toBe('JSON Output');
      expect(JSON.parse(json?.props.plaintextOutput ?? '')).toEqual({
        root: 'note',
      });
    });

    it.each([
      '<root>&missing;</root>',
      '<root label="&missing;"/>',
      '<root>&declared; &missing;</root>',
    ])('rejects undeclared DTD references in %s', async (root) => {
      const [box] = await DataConverterBoxSource.generateBoxes(
        `<!DOCTYPE root [<!ENTITY declared "note">]>${root}`,
        { xml: true, json: true },
      );
      expect(box?.props.isError).toBe(true);
      expect(box?.props.plaintextOutput).toMatch(
        /Failed to parse input as XML: .*undefined entity/,
      );
    });

    it.each([
      '<root><a>1</a><b>2</b><a>3</a></root>',
      '<p>Hello <b>world</b> !</p>',
      '<p><b>one</b> <b>two</b></p>',
    ])('explains when %s cannot be represented in other formats', async (input) => {
      const boxes = await DataConverterBoxSource.generateBoxes(input, {
        xml: true,
        json: true,
        yaml: true,
        toml: true,
      });
      expect(boxes.filter(({ props }) => props.isError)).toHaveLength(3);
      expect(
        boxes.find(({ props }) => props.name === 'XML Output'),
      ).toBeDefined();
      for (const { props } of boxes.filter(({ props }) => props.isError)) {
        expect(props.plaintextOutput).toMatch(
          /cannot convert to .*xml.*use XML output/i,
        );
      }
    });

    it('keeps the simple XML object mapping and preserves leaf text', async () => {
      const input =
        '<root id=" x ">\n<item>  one  </item>\n<item>two</item>\n</root>';
      const [box] = await DataConverterBoxSource.generateBoxes(input, {
        json: true,
      });
      expect(box?.props.name).toBe('JSON Output');
      expect(JSON.parse(box?.props.plaintextOutput ?? '')).toEqual({
        root: { '@_id': ' x ', item: ['  one  ', 'two'] },
      });
    });

    it.each([
      'a b',
      '123',
      '',
      '@_a b',
      '?xml',
      'a:b',
    ])('rejects an invalid generated XML name %j', async (name) => {
      const [box] = await DataConverterBoxSource.generateBoxes(
        JSON.stringify({ root: { [name]: 1 } }),
        { xml: true },
      );
      expect(box?.props.isError).toBe(true);
      expect(box?.props.plaintextOutput).toMatch(/Cannot convert to XML/);
      expect(box?.props.plaintextOutput).toMatch(
        /XML name|unbound namespace prefix/i,
      );
    });

    it('accepts declared namespaces and Unicode names in generated XML', async () => {
      const output = await xmlOutput(
        JSON.stringify({
          root: {
            '@_xmlns:ns': 'urn:notes',
            'ns:內容': { '@_ns:mode': ' text ', '#text': '一與二' },
          },
        }),
      );
      const element = parseXml(output).getElementsByTagNameNS(
        'urn:notes',
        '內容',
      )[0];
      expect(element?.getAttributeNS('urn:notes', 'mode')).toBe(' text ');
      expect(element?.textContent).toBe('一與二');
    });
  });

  describe('YAML 1.1 features', () => {
    it('should resolve anchors and aliases', async () => {
      const yamlInput = `defaults: &defaults
  retries: 3
prod: *defaults`;
      const boxes = await DataConverterBoxSource.generateBoxes(yamlInput, {
        json: true,
      });

      const jsonBox = boxes.find((b) => b.props.name === 'JSON Output');
      const parsed = JSON.parse(jsonBox?.props.plaintextOutput ?? '{}');
      expect(parsed.prod).toEqual({ retries: 3 });
    });

    it('should expand merge keys instead of emitting a literal "<<" key', async () => {
      const yamlInput = `defaults: &defaults
  retries: 3
  timeout: 5
prod:
  <<: *defaults
  timeout: 30`;
      const boxes = await DataConverterBoxSource.generateBoxes(yamlInput, {
        json: true,
      });

      const jsonBox = boxes.find((b) => b.props.name === 'JSON Output');
      const parsed = JSON.parse(jsonBox?.props.plaintextOutput ?? '{}');
      expect(parsed.prod).toEqual({ retries: 3, timeout: 30 });
      expect(parsed.prod['<<']).toBeUndefined();
    });

    it('should accept documents that reuse anchors well past the library default', async () => {
      // The `yaml` default budget of 100 rejects this; real configs routinely
      // reference a shared block hundreds of times.
      const anchor = 'base: &base\n  a: 1\n  b: 2\n  c: 3\n';
      const uses = Array.from(
        { length: 300 },
        (_, i) => `svc${i}:\n  <<: *base\n  id: ${i}`,
      ).join('\n');
      const boxes = await DataConverterBoxSource.generateBoxes(anchor + uses, {
        json: true,
      });

      const jsonBox = boxes.find((b) => b.props.name === 'JSON Output');
      const parsed = JSON.parse(jsonBox?.props.plaintextOutput ?? '{}');
      expect(parsed.svc299).toEqual({ a: 1, b: 2, c: 3, id: 299 });
    });
  });

  describe('multi-document YAML', () => {
    const multiDoc = `kind: Service
name: api
---
kind: Deployment
name: api`;

    it('should convert a --- separated stream to a JSON array', async () => {
      const boxes = await DataConverterBoxSource.generateBoxes(multiDoc, {
        json: true,
      });

      const jsonBox = boxes.find((b) => b.props.name === 'JSON Output');
      const parsed = JSON.parse(jsonBox?.props.plaintextOutput ?? 'null');
      expect(parsed).toEqual([
        { kind: 'Service', name: 'api' },
        { kind: 'Deployment', name: 'api' },
      ]);
    });

    it('should round-trip back to a --- separated stream, not a sequence', async () => {
      // spaced out so the reformatted output differs from the input and the
      // "source format is already pretty" suppression does not hide the box
      const boxes = await DataConverterBoxSource.generateBoxes(
        'kind:    Service\nname:    api\n---\nkind:    Deployment\nname:    api',
        { yaml: true },
      );

      const yamlBox = boxes.find((b) => b.props.name === 'YAML Output');
      expect(yamlBox?.props.plaintextOutput).toBe(
        'kind: Service\nname: api\n---\nkind: Deployment\nname: api\n',
      );
    });

    it('should suppress the YAML box when the stream is already canonical', async () => {
      const boxes = await DataConverterBoxSource.generateBoxes(multiDoc, {
        yaml: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('should ignore a trailing separator rather than emit an array', async () => {
      const boxes = await DataConverterBoxSource.generateBoxes('a: 1\n---\n', {
        json: true,
      });

      const jsonBox = boxes.find((b) => b.props.name === 'JSON Output');
      expect(JSON.parse(jsonBox?.props.plaintextOutput ?? 'null')).toEqual({
        a: 1,
      });
    });

    it('should report a syntax error in any document of the stream', async () => {
      const boxes = await DataConverterBoxSource.generateBoxes(
        'a: 1\n---\nb: 2\nb: 3\n',
        { json: true },
      );

      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toContain(
        'Failed to parse input as YAML',
      );
    });

    it('should report an alias that reaches across documents', async () => {
      // anchors are document-scoped, so this resolves to nothing at toJS time
      const boxes = await DataConverterBoxSource.generateBoxes(
        'x: &x\n  p: 1\n---\ny:\n  <<: *x\n',
        { json: true },
      );

      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toContain(
        'Failed to parse input as YAML',
      );
    });

    it('should report that TOML cannot hold a multi-document stream', async () => {
      const boxes = await DataConverterBoxSource.generateBoxes(multiDoc, {
        toml: true,
      });

      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Data Converter');
      expect(boxes[0].props.plaintextOutput).toContain(
        'Cannot convert to TOML',
      );
    });
  });

  describe('TOML detection gate', () => {
    it('should not treat YAML containing "=" as a TOML candidate', async () => {
      const yamlInput = `args:
  - --flag=value
name: demo`;
      const boxes = await DataConverterBoxSource.generateBoxes(yamlInput, {
        json: true,
      });

      const jsonBox = boxes.find((b) => b.props.name === 'JSON Output');
      const parsed = JSON.parse(jsonBox?.props.plaintextOutput ?? '{}');
      expect(parsed.args).toEqual(['--flag=value']);
      expect(parsed.name).toBe('demo');
    });

    it('should still detect TOML table headers and dotted keys', async () => {
      const tomlInput = `# comment
[server]
host = "localhost"

[server.limits]
"max-body" = 100

[[route]]
path = "/health"`;
      const boxes = await DataConverterBoxSource.generateBoxes(tomlInput, {
        json: true,
      });

      const jsonBox = boxes.find((b) => b.props.name === 'JSON Output');
      const parsed = JSON.parse(jsonBox?.props.plaintextOutput ?? '{}');
      expect(parsed.server.host).toBe('localhost');
      expect(parsed.server.limits['max-body']).toBe(100);
      expect(parsed.route).toEqual([{ path: '/health' }]);
    });
  });

  describe('TOML value preservation', () => {
    const tomlDateInput = `offset=1979-05-27T07:32:00.125-08:00
local=1979-05-27T07:32:00.125
birthday=1979-05-27
time=07:32:00.125
[nested]
dates=[1979-05-27,1979-05-28]`;
    const dateStrings = {
      offset: '1979-05-27T07:32:00.125-08:00',
      local: '1979-05-27T07:32:00.125',
      birthday: '1979-05-27',
      time: '07:32:00.125',
      nested: { dates: ['1979-05-27', '1979-05-28'] },
    };

    it.each([
      'automatic',
      'explicit',
    ])('keeps TOML date and time kinds during %s formatting', async (mode) => {
      const [box] = await DataConverterBoxSource.generateBoxes(
        tomlDateInput,
        mode === 'explicit' ? { toml: true } : {},
      );
      expect(box?.props.name).toBe('TOML Output');
      const result = parseToml(box?.props.plaintextOutput ?? '');
      expect(result.offset).toBeInstanceOf(TomlDate);
      expect(result.local).toBeInstanceOf(TomlDate);
      expect(result.birthday).toBeInstanceOf(TomlDate);
      expect(result.time).toBeInstanceOf(TomlDate);
      expect((result.offset as TomlDate).isDateTime()).toBe(true);
      expect((result.offset as TomlDate).isLocal()).toBe(false);
      expect((result.local as TomlDate).isDateTime()).toBe(true);
      expect((result.local as TomlDate).isLocal()).toBe(true);
      expect((result.birthday as TomlDate).isDate()).toBe(true);
      expect((result.time as TomlDate).isTime()).toBe(true);
      const { dates } = result.nested as { dates: TomlDate[] };
      expect(dates.map((date) => date.isDate())).toEqual([true, true]);
      expect(JSON.parse(JSON.stringify(result))).toEqual(dateStrings);
    });

    it('converts TOML dates to strings with their original local or offset times', async () => {
      const boxes = await DataConverterBoxSource.generateBoxes(tomlDateInput, {
        json: true,
        yaml: true,
        xml: true,
      });
      const output = Object.fromEntries(
        boxes.map((box) => [box.props.name, box.props.plaintextOutput]),
      );
      expect(JSON.parse(output['JSON Output'] ?? '')).toEqual(dateStrings);
      expect(
        parseYaml(output['YAML Output'] ?? '', { version: '1.1' }),
      ).toEqual(dateStrings);

      const xml = new DOMParser().parseFromString(
        output['XML Output'] ?? '',
        'application/xml',
      );
      expect(xml.querySelector('offset')?.textContent).toBe(dateStrings.offset);
      expect(xml.querySelector('local')?.textContent).toBe(dateStrings.local);
      expect(xml.querySelector('birthday')?.textContent).toBe(
        dateStrings.birthday,
      );
      expect(xml.querySelector('time')?.textContent).toBe(dateStrings.time);
      expect(
        Array.from(
          xml.querySelectorAll('nested > dates'),
          (node) => node.textContent,
        ),
      ).toEqual(dateStrings.nested.dates);
    });

    it('gives a standalone TOML date array one XML document root', async () => {
      const [box] = await DataConverterBoxSource.generateBoxes(
        'dates=[1979-05-27,1979-05-28]',
        { xml: true },
      );
      expect(box?.props.name).toBe('XML Output');
      const xml = new DOMParser().parseFromString(
        box?.props.plaintextOutput ?? '',
        'application/xml',
      );
      expect(xml.documentElement.tagName).toBe('root');
      expect(
        Array.from(xml.documentElement.children, (node) => [
          node.tagName,
          node.textContent,
        ]),
      ).toEqual([
        ['dates', '1979-05-27'],
        ['dates', '1979-05-28'],
      ]);
    });

    it('round-trips signed int64 and integers around the JS safe range', async () => {
      const values = [
        -9223372036854775808n,
        -9007199254740993n,
        -9007199254740992n,
        -9007199254740991n,
        9007199254740991n,
        9007199254740992n,
        9007199254740993n,
        9223372036854775807n,
      ];
      const jsonInput = `{"values":[${values.join(',')}],"label":"integers"}`;
      const [toToml] = await DataConverterBoxSource.generateBoxes(jsonInput, {
        toml: true,
      });
      expect(toToml?.props.name).toBe('TOML Output');
      const toml = toToml?.props.plaintextOutput ?? '';
      expect(parseToml(toml, { integersAsBigInt: true }).values).toEqual(
        values,
      );

      const boxes = await DataConverterBoxSource.generateBoxes(toml, {
        json: true,
        yaml: true,
        xml: true,
      });
      const output = Object.fromEntries(
        boxes.map((box) => [box.props.name, box.props.plaintextOutput]),
      );
      expect(output['JSON Output']?.replace(/\s/g, '')).toBe(jsonInput);
      expect(
        parseYaml(output['YAML Output'] ?? '', { intAsBigInt: true }),
      ).toEqual({ values, label: 'integers' });
      const [reformatted] = await DataConverterBoxSource.generateBoxes(
        toml.replace('values =', 'values='),
        { toml: true },
      );
      expect(reformatted?.props.plaintextOutput).toBe(toml);
      const xml = new DOMParser().parseFromString(
        output['XML Output'] ?? '',
        'application/xml',
      );
      expect(
        Array.from(xml.querySelectorAll('values'), (node) => node.textContent),
      ).toEqual(values.map(String));
    });
  });

  describe('parse failure reporting', () => {
    it('should report the parse error when a target format was requested', async () => {
      // duplicate keys are a hard error in the YAML spec
      const boxes = await DataConverterBoxSource.generateBoxes('a: 1\na: 2\n', {
        json: true,
      });

      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Data Converter');
      expect(boxes[0].props.plaintextOutput).toContain(
        'Failed to parse input as YAML',
      );
      expect(boxes[0].props.plaintextOutput).toContain('Map keys must be uniq');
    });

    it('should stay silent on a parse failure when no target format was requested', async () => {
      const boxes = await DataConverterBoxSource.generateBoxes(
        'a: 1\na: 2\n',
        {},
      );
      expect(boxes).toHaveLength(0);
    });

    it('should stay silent on empty input even with a target format', async () => {
      const boxes = await DataConverterBoxSource.generateBoxes('   ', {
        json: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('should prefer the JSON error over looser format guesses', async () => {
      // fails JSON and YAML alike; JSON's brace gate is the more specific match
      const boxes = await DataConverterBoxSource.generateBoxes(
        '{"a": 1, "b": @x}',
        { yaml: true },
      );

      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toContain(
        'Failed to parse input as JSON',
      );
    });
  });

  describe('alongside JSON Tools', () => {
    const converter = (raw: string) => {
      const [input, options] = parseInput(raw);
      return DataConverterBoxSource.generateBoxes(input, options);
    };

    it('skips the auto-format guess for a JSON Tools directive', async () => {
      expect(await converter('{"a":1,"b":2}\n::jsonpick=a')).toEqual([]);
      expect(await converter('{"a":1}\n---\n{"b":2}\n::jsonmerge')).toEqual([]);
    });

    it('still honours an explicit target', async () => {
      const boxes = await converter('{"a":1,"b":2}\n::jsonpick=a\n::toyaml');
      expect(boxes.map((b) => b.props.name)).toEqual(['YAML Output']);
    });
  });

  describe('alongside CSV Table', () => {
    const converter = (raw: string) => {
      const [input, options] = parseInput(raw);
      return DataConverterBoxSource.generateBoxes(input, options);
    };

    it('skips the auto-format guess for a CSV Table directive', async () => {
      expect(await converter('[{"a":1,"b":2}]\n::csv')).toEqual([]);
      expect(await converter('[{"a":1,"b":2}]\n::md')).toEqual([]);
    });

    it('leaves ::json under a CSV table to CSV Table', async () => {
      expect(await converter('name,age\nAlice,30\n::json')).toEqual([]);
      expect(await converter('name\tage\nAlice\t30\n::tojson')).toEqual([]);
    });

    it('still reports a target CSV Table cannot answer', async () => {
      const boxes = await converter('name,age\nAlice,30\n::toyaml');
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.isError).toBe(true);
    });

    it('still reports ::json on text that is not a table', async () => {
      const boxes = await converter('hello, world\n::json');
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.isError).toBe(true);
    });
  });

  describe('lossless detection and conversion', () => {
    it('does not auto-detect one-line YAML-looking prose', async () => {
      for (const input of ['Version: 1.0', '- buy milk', 'TODO: "fix this"']) {
        await expect(
          DataConverterBoxSource.generateBoxes(input, {}),
        ).resolves.toHaveLength(0);
      }
    });

    it('preserves JSON integer and decimal lexemes across output formats', async () => {
      const input = '{"id":12345678901234567890,"price":1.10,"zip":"01234"}';
      const boxes = await DataConverterBoxSource.generateBoxes(input, {
        json: true,
        yaml: true,
        toml: true,
      });
      const json = boxes.find((box) => box.props.name === 'JSON Output');
      const yaml = boxes.find((box) => box.props.name === 'YAML Output');
      const toml = boxes.find((box) => box.props.name === 'TOML Output');

      expect(json?.props.plaintextOutput).toContain('12345678901234567890');
      expect(json?.props.plaintextOutput).toContain('1.10');
      expect(yaml?.props.plaintextOutput).toContain('12345678901234567890');
      expect(yaml?.props.plaintextOutput).toContain('price: 1.10');
      expect(toml?.props.plaintextOutput).toContain(
        'id = 12345678901234567890',
      );
      expect(toml?.props.plaintextOutput).toContain('price = 1.10');
    });

    it('round-trips precise YAML decimals and finite exponents through JSON', async () => {
      const values = [
        '0.12345678901234567890',
        '-1e-400',
        '1.7976931348623159e+308',
        '-1.25000000000000000001',
        '-0.0',
      ];
      const input = `values:   [${values.join(',')}] # exact numbers`;
      const boxes = await DataConverterBoxSource.generateBoxes(input, {
        json: true,
        yaml: true,
      });
      const json = boxes.find((box) => box.props.name === 'JSON Output')?.props
        .plaintextOutput;
      const yaml = boxes.find((box) => box.props.name === 'YAML Output')?.props
        .plaintextOutput;
      expect(json).toBe(
        `{\n    "values": [\n        ${values.join(',\n        ')}\n    ]\n}`,
      );
      for (const value of values) expect(yaml).toContain(value);
      expect(yaml).toContain('# exact numbers');

      const [fromYaml] = await DataConverterBoxSource.generateBoxes(
        yaml ?? '',
        {
          json: true,
        },
      );
      expect(fromYaml.props.plaintextOutput).toBe(json);
      const [fromJson] = await DataConverterBoxSource.generateBoxes(
        json ?? '',
        {
          yaml: true,
        },
      );
      const [roundTrip] = await DataConverterBoxSource.generateBoxes(
        fromJson.props.plaintextOutput,
        { json: true },
      );
      expect(roundTrip.props.plaintextOutput).toBe(json);
    });

    it.each([
      '1e-400',
      '1.7976931348623159e+308',
      '0.12345678901234567890',
    ])('reports lossy TOML output for precise YAML number %s', async (number) => {
      const input = `value: ${number}\n`;
      const boxes = await DataConverterBoxSource.generateBoxes(input, {
        json: true,
        toml: true,
        xml: true,
      });

      expect(
        boxes.find((box) => box.props.name === 'JSON Output')?.props
          .plaintextOutput,
      ).toContain(`"value": ${number}`);
      expect(
        boxes.find((box) => box.props.name === 'XML Output')?.props
          .plaintextOutput,
      ).toContain(`<value>${number}</value>`);
      expect(
        boxes.find((box) => box.props.isError)?.props.plaintextOutput,
      ).toMatch(/Cannot convert to TOML: .*losslessly/);
      expect(boxes.some((box) => box.props.name === 'TOML Output')).toBe(false);
    });

    it('keeps existing TOML output for JSON numbers and representable YAML decimals', async () => {
      const [jsonToToml] = await DataConverterBoxSource.generateBoxes(
        '{"value": 0.12345678901234567890}',
        { toml: true },
      );
      expect(jsonToToml.props.plaintextOutput).toContain(
        'value = 0.12345678901234567890',
      );

      const [yamlToToml] = await DataConverterBoxSource.generateBoxes(
        'price: 1.10\nzero: -0.0',
        { toml: true },
      );
      expect(yamlToToml.props.plaintextOutput).toContain('price = 1.10');
      expect(yamlToToml.props.plaintextOutput).toContain('zero = -0.0');
    });

    it('keeps exact YAML numeric values in anchors and YAML 1.1 forms', async () => {
      const input = [
        '%YAML 1.1',
        '---',
        'value: &value !!float "+001_234.5678901234567890"',
        'alias: *value',
        'small: -.00000000000000000001',
        'time: -1:02.12345678901234567890',
        'trailing: 2.',
        'integer: 0x20000000000001',
        'text: "0.12345678901234567890"',
      ].join('\n');
      const [box] = await DataConverterBoxSource.generateBoxes(input, {
        json: true,
      });
      const output = box.props.plaintextOutput;
      expect(box.props.name).toBe('JSON Output');
      expect(output).toContain('"value": 1234.5678901234567890');
      expect(output).toContain('"alias": 1234.5678901234567890');
      expect(output).toContain('"small": -0.00000000000000000001');
      expect(output).toContain('"time": -62.12345678901234567890');
      expect(output).toContain('"trailing": 2.0');
      expect(output).toContain('"integer": 9007199254740993');
      expect(output).toContain('"text": "0.12345678901234567890"');
    });

    it('compares YAML numeric map keys at their original precision', async () => {
      const distinct = await DataConverterBoxSource.generateBoxes(
        '0.12345678901234567890: first\n0.12345678901234567891: second\n',
        { json: true },
      );
      expect(distinct[0].props.name).toBe('JSON Output');
      expect(JSON.parse(distinct[0].props.plaintextOutput)).toEqual({
        '0.12345678901234567890': 'first',
        '0.12345678901234567891': 'second',
      });

      const duplicate = await DataConverterBoxSource.generateBoxes(
        '1e-400: first\n0.01e-398: second',
        { json: true },
      );
      expect(duplicate[0].props.isError).toBe(true);
      expect(duplicate[0].props.plaintextOutput).toContain(
        'Map keys must be unique',
      );
    });

    it.each([
      '.nan',
      '.inf',
      '-.Inf',
    ])('reports a JSON error for explicit YAML non-finite value %s', async (number) => {
      const input = `values:   [${number}]\n`;
      const boxes = await DataConverterBoxSource.generateBoxes(input, {
        json: true,
        yaml: true,
        toml: true,
      });
      const error = boxes.find((box) => box.props.isError);
      expect(error?.props.plaintextOutput).toMatch(
        /Cannot convert to JSON: .*non-finite/,
      );
      expect(boxes.some((box) => box.props.name === 'JSON Output')).toBe(false);
      expect(
        boxes.find((box) => box.props.name === 'YAML Output')?.props
          .plaintextOutput,
      ).toContain(number);
      expect(boxes.some((box) => box.props.name === 'TOML Output')).toBe(true);
    });

    it('keeps XML element values as strings and rejects incomplete XML', async () => {
      const boxes = await DataConverterBoxSource.generateBoxes(
        '<a><zip>01234</zip><v>1.0</v></a>',
        { json: true },
      );
      const json = boxes.find((box) => box.props.name === 'JSON Output');
      expect(json?.props.plaintextOutput).toContain('"01234"');
      expect(json?.props.plaintextOutput).toContain('"1.0"');

      const invalid = await DataConverterBoxSource.generateBoxes('<hello>', {
        xml: true,
      });
      expect(invalid).toHaveLength(1);
      expect(invalid[0].props.plaintextOutput).toContain(
        'Failed to parse input as XML',
      );
    });

    it('reports incompatible empty XML and TOML results', async () => {
      const emptyXml = await DataConverterBoxSource.generateBoxes('{}', {
        xml: true,
      });
      expect(emptyXml[0].props.plaintextOutput).toContain(
        'Cannot convert to XML',
      );

      const nullToml = await DataConverterBoxSource.generateBoxes(
        '{"a":null}',
        { toml: true },
      );
      expect(nullToml[0].props.plaintextOutput).toContain(
        'Cannot convert to TOML',
      );
    });

    it('bounds automatic and explicit large inputs before parsing', async () => {
      const automatic = await DataConverterBoxSource.generateBoxes(
        'a'.repeat(256 * 1024 + 1),
        {},
      );
      expect(automatic).toHaveLength(0);

      const explicit = await DataConverterBoxSource.generateBoxes(
        'a'.repeat(1024 * 1024 + 1),
        { yaml: true },
      );
      expect(explicit).toHaveLength(1);
      expect(explicit[0].props.plaintextOutput).toContain('Input is too large');
    });
  });
});
