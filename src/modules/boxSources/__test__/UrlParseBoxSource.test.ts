import { KeyValueBoxTemplate } from '@components/BoxTemplate';
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
      expect(boxes[0].props.priority).toBe(10);
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
      expect(boxes[0].props.options).toMatchObject({
        Protocol: 'https',
        Host: 'example.com',
        Port: '8080',
        Path: '/a/b',
        Query: 'x=1&y=2',
        Hash: 'frag',
        Username: 'user',
        Password: 'pass',
      });
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
      // the error box must reference "invalid" in some form
      const opts = boxes[0].props.options as Record<string, string>;
      const combined = JSON.stringify(opts).toLowerCase();
      expect(combined).toMatch(/not a valid|invalid/);
    });

    it('includes Params key when query string is present', async () => {
      const boxes = await UrlParseBoxSource.generateBoxes(
        'https://example.com/path?x=1&y=2',
        { urlparse: true },
      );

      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Params).toBeDefined();
      expect(opts.Params).toContain('x=1');
      expect(opts.Params).toContain('y=2');
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
});
