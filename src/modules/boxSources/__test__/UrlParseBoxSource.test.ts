import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';
import { UrlParseBoxSource } from '../UrlParseBoxSource';

describe('UrlParseBoxSource', () => {
  describe('generateBoxes', () => {
    it('should return empty array when no option key is present', async () => {
      const boxes = await UrlParseBoxSource.generateBoxes(
        'https://example.com/',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('should return empty array when option keys do not match', async () => {
      const boxes = await UrlParseBoxSource.generateBoxes(
        'https://example.com/',
        { json: true },
      );
      expect(boxes).toHaveLength(0);
    });

    it('should parse a full URL with all components', async () => {
      const boxes = await UrlParseBoxSource.generateBoxes(
        'https://user:pass@example.com:8080/a/b?x=1&y=2#frag',
        { urlparse: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('URL Parse');
      expect(boxes[0].props.priority).toBe(10);
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Protocol).toBe('https');
      expect(opts.Host).toBe('example.com');
      expect(opts.Port).toBe('8080');
      expect(opts.Username).toBe('user');
      expect(opts.Password).toBe('pass');
      expect(opts.Path).toBe('/a/b');
      expect(opts.Query).toBe('x=1&y=2');
      expect(opts.Hash).toBe('frag');
    });

    it('should accept ::parseurl alias', async () => {
      const boxes = await UrlParseBoxSource.generateBoxes(
        'https://example.com/',
        { parseurl: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Protocol: 'https',
        Host: 'example.com',
        Path: '/',
      });
    });

    it('should parse a minimal URL with only required fields', async () => {
      const boxes = await UrlParseBoxSource.generateBoxes(
        'https://example.com/',
        { urlparse: true },
      );
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Protocol).toBe('https');
      expect(opts.Host).toBe('example.com');
      expect(opts.Path).toBe('/');
      // optional fields absent when empty
      expect(opts.Port).toBeUndefined();
      expect(opts.Username).toBeUndefined();
      expect(opts.Password).toBeUndefined();
      expect(opts.Query).toBeUndefined();
      expect(opts.Hash).toBeUndefined();
    });

    it('should return an error box for an invalid URL', async () => {
      const boxes = await UrlParseBoxSource.generateBoxes('not a url', {
        urlparse: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('URL Parse');
      // output text should mention the invalid input
      expect(boxes[0].props.plaintextOutput).toContain('Invalid URL');
    });
  });
});
