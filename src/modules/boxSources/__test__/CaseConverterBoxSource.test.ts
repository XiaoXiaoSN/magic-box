import { CaseConverterBoxSource } from '@modules/boxSources/CaseConverterBoxSource';
import { describe, expect, it } from 'vitest';

type StringOptions = Record<string, string>;

function boxOptions(
  box: Awaited<ReturnType<typeof CaseConverterBoxSource.generateBoxes>>[number],
): StringOptions {
  return box.props.options as StringOptions;
}

describe('CaseConverterBoxSource', () => {
  it('requires an explicit format option and returns no box for blank input', async () => {
    await expect(
      CaseConverterBoxSource.generateBoxes('hello world', null),
    ).resolves.toEqual([]);
    await expect(
      CaseConverterBoxSource.generateBoxes('   ', { case: true }),
    ).resolves.toEqual([]);
  });

  it('lists all formats with non-empty plaintext output', async () => {
    const [box] = await CaseConverterBoxSource.generateBoxes(
      'XMLHttpRequest userID v2ApiKey',
      { case: true },
    );
    const options = boxOptions(box);
    expect(options.camelCase).toBe('xmlHttpRequestUserIdV2ApiKey');
    expect(options.PascalCase).toBe('XmlHttpRequestUserIdV2ApiKey');
    expect(options.snake_case).toBe('xml_http_request_user_id_v_2_api_key');
    expect(options.CONSTANT_CASE).toBe('XML_HTTP_REQUEST_USER_ID_V_2_API_KEY');
    expect(options['kebab-case']).toBe('xml-http-request-user-id-v-2-api-key');
    expect(options['Title Case']).toBe('Xml Http Request User Id V 2 Api Key');
    expect(options['dot.case']).toBe('xml.http.request.user.id.v.2.api.key');
    expect(options['path/case']).toBe('xml/http/request/user/id/v/2/api/key');
    expect(box.props.plaintextOutput).toContain(
      'snake_case: xml_http_request_user_id_v_2_api_key',
    );
  });

  it('keeps mixed separators and acronym boundaries in existing formats', async () => {
    const [box] = await CaseConverterBoxSource.generateBoxes(
      'myHTTPSClient hello-world_foo',
      { case: true },
    );
    const options = boxOptions(box);
    expect(options.camelCase).toBe('myHttpsClientHelloWorldFoo');
    expect(options.snake_case).toBe('my_https_client_hello_world_foo');
    expect(options['kebab-case']).toBe('my-https-client-hello-world-foo');
  });

  it('scans long uppercase input within the supported limit', async () => {
    const input = 'A'.repeat(100_000);
    const [box] = await CaseConverterBoxSource.generateBoxes(input, {
      case: true,
    });
    expect(boxOptions(box).snake_case).toBe('a'.repeat(100_000));
  });

  it('splits Unicode case and acronym boundaries while preserving CJK and emoji', async () => {
    const [box] = await CaseConverterBoxSource.generateBoxes(
      'ÄpfelÜber 中文測試 👩‍💻',
      {
        snake: true,
      },
    );
    expect(box.props.plaintextOutput).toBe('äpfel_über_中文測試_👩‍💻');
  });

  it('preserves each original line break in all selected formats', async () => {
    const [box] = await CaseConverterBoxSource.generateBoxes(
      'fooBar\r\n\nXMLParser\n',
      {
        case: 'snake',
      },
    );
    expect(box.props.plaintextOutput).toBe('foo_bar\r\n\nxml_parser\n');

    const [upper] = await CaseConverterBoxSource.generateBoxes('a!\r\nb', {
      upper: true,
    });
    expect(upper.props.plaintextOutput).toBe('A!\r\nB');
  });

  it.each([
    ['camel', 'helloWorldFooBar'],
    ['camelCase', 'helloWorldFooBar'],
    ['CAMEL', 'helloWorldFooBar'],
    ['camel-case', 'helloWorldFooBar'],
    ['pascal', 'HelloWorldFooBar'],
    ['snake', 'hello_world_foo_bar'],
    ['snake_case', 'hello_world_foo_bar'],
    ['constant', 'HELLO_WORLD_FOO_BAR'],
    ['kebab', 'hello-world-foo-bar'],
    ['title', 'Hello World Foo Bar'],
    ['dot', 'hello.world.foo.bar'],
    ['path', 'hello/world/foo/bar'],
    ['sentence', 'Hello world foo bar'],
    ['lower', 'helloworld foobar'],
    ['upper', 'HELLOWORLD FOOBAR'],
    ['uppercase', 'HELLOWORLD FOOBAR'],
  ])('::case=%s selects only its format', async (format, expected) => {
    const boxes = await CaseConverterBoxSource.generateBoxes(
      'helloWorld fooBar',
      {
        case: format,
      },
    );
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.plaintextOutput).toBe(expected);
  });

  it('keeps existing per-format aliases and lets them narrow ::case', async () => {
    const boxes = await CaseConverterBoxSource.generateBoxes('fooBar', {
      case: true,
      snakecase: true,
      path: true,
    });
    expect(boxes.map((box) => box.props.name)).toEqual([
      'snake_case',
      'path/case',
    ]);
  });

  it('reports an unknown explicit format', async () => {
    const [box] = await CaseConverterBoxSource.generateBoxes('fooBar', {
      case: 'spongebob',
    });
    expect(box.props.plaintextOutput).toContain('Unknown case "spongebob"');
    expect(box.props.plaintextOutput).toContain('camel');
  });

  it('rejects inputs above the explicit 100 KiB limit before tokenization', async () => {
    const [box] = await CaseConverterBoxSource.generateBoxes(
      'x'.repeat(100 * 1024 + 1),
      {
        case: true,
      },
    );
    expect(box.props.plaintextOutput).toContain('up to 100 KiB');
  });
});
