import { describe, expect, it } from 'vitest';
import { UrlParseBoxSource } from '../UrlParseBoxSource';

describe('UrlParseBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when no matching option key is present', async () => {
      const boxes = await UrlParseBoxSource.generateBoxes(
        'https://example.com/',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when an unrelated option key is given', async () => {
      const boxes = await UrlParseBoxSource.generateBoxes(
        'https://example.com/',
        { base64: true },
      );
      expect(boxes).toHaveLength(0);
    });

    it('parses a full URL with auth, port, path, query, and hash', async () => {
      const boxes = await UrlParseBoxSource.generateBoxes(
        'https://user:pass@example.com:8080/a/b?x=1&y=2#frag',
        { urlparse: true },
      );

      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('URL Parse');
      expect(boxes[0].view).toBe('keyValue');
      expect(boxes[0].props.options).toMatchObject({
        Protocol: 'https',
        Host: 'example.com',
        Port: '8080',
        Path: '/a/b',
        Query: 'x=1&y=2',
        Hash: 'frag',
        Username: 'user',
        Password: 'pass',
        'Query · x': '1',
        'Query · y': '2',
      });
      expect(boxes[0].props.plaintextOutput).toContain('Query · x: 1');
    });

    it('parses a simple URL without optional fields', async () => {
      const boxes = await UrlParseBoxSource.generateBoxes(
        'https://example.com/',
        {
          urlparse: true,
        },
      );

      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Protocol: 'https',
        Host: 'example.com',
        Path: '/',
      });

      // Query, Hash, Username, Password must not be present when empty
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Query).toBeUndefined();
      expect(opts.Hash).toBeUndefined();
      expect(opts.Username).toBeUndefined();
      expect(opts.Password).toBeUndefined();
    });

    it('triggers on ::parseurl alias', async () => {
      const boxes = await UrlParseBoxSource.generateBoxes(
        'https://example.com/',
        {
          parseurl: true,
        },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({ Protocol: 'https' });
    });

    it('returns an error box for an invalid URL', async () => {
      const boxes = await UrlParseBoxSource.generateBoxes('not a url', {
        urlparse: true,
      });

      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('URL Parse');
      expect(boxes[0].props.plaintextOutput).toBe('Invalid URL: not a url');
      expect(boxes[0].boxTemplate).toBeUndefined();
    });

    it('renders each decoded query parameter as a separate field', async () => {
      const boxes = await UrlParseBoxSource.generateBoxes(
        'https://example.com/path?given%20name=Ada+Lovelace&active=',
        { urlparse: true },
      );

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Query · given name']).toBe('Ada Lovelace');
      expect(opts['Query · active']).toBe('');
    });

    it('preserves repeated query parameter values in one field', async () => {
      const boxes = await UrlParseBoxSource.generateBoxes(
        'https://example.com/path?tag=a&tag=b',
        { urlparse: true },
      );

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Query · tag']).toBe('a\nb');
    });

    it.each([
      '=first&(empty%20key)=second',
      '(empty%20key)=second&=first',
    ])('keeps the empty and literal placeholder keys distinct in %s', async (query) => {
      const [box] = await UrlParseBoxSource.generateBoxes(
        `https://example.com/?${query}`,
        { urlparse: true },
      );

      expect(box.props.options).toMatchObject({
        Query: query,
        'Query · (empty key)': 'first',
        'Query · "(empty key)"': 'second',
      });
      expect(box.props.plaintextOutput).toContain('Query · (empty key): first');
      expect(box.props.plaintextOutput).toContain(
        'Query · "(empty key)": second',
      );
    });

    it('keeps repeats and empty values for distinct query names that need quoting', async () => {
      const [box] = await UrlParseBoxSource.generateBoxes(
        'https://example.com/?=first&(empty+key)=second&=&(empty%20key)=&=third&%22(empty%20key)%22=quoted&tag=a&tag=&tag=b',
        { urlparse: true },
      );

      expect(box.props.options).toMatchObject({
        'Query · (empty key)': 'first\n\nthird',
        'Query · "(empty key)"': 'second\n',
        'Query · "\\"(empty key)\\""': 'quoted',
        'Query · tag': 'a\n\nb',
      });
    });

    it('uses default port when url.port is empty', async () => {
      const boxes = await UrlParseBoxSource.generateBoxes(
        'https://example.com/path',
        {
          urlparse: true,
        },
      );

      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Port).toBe('443');
    });

    it('returns [] when input exceeds MAX_INPUT', async () => {
      const longInput = `https://example.com/${'a'.repeat(100_001)}`;
      const boxes = await UrlParseBoxSource.generateBoxes(longInput, {
        urlparse: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  it.each([
    ['localhost:3000', 'localhost', '3000', '/'],
    ['example.com:8080/path', 'example.com', '8080', '/path'],
  ])('parses a bare host and port: %s', async (input, host, port, path) => {
    const boxes = await UrlParseBoxSource.generateBoxes(input, {
      urlparse: true,
    });
    expect(boxes[0].props.options).toMatchObject({
      Protocol: 'https',
      Host: host,
      Port: port,
      Path: path,
    });
  });

  it('rejects embedded newlines instead of joining URL components', async () => {
    const boxes = await UrlParseBoxSource.generateBoxes(
      'https://a.com/x\ny?q=1',
      { urlparse: true },
    );
    expect(boxes[0].props.plaintextOutput).toBe(
      'Invalid URL: https://a.com/x\ny?q=1',
    );
  });
});
