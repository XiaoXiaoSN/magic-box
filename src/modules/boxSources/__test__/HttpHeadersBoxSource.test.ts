import { describe, expect, it } from 'vitest';

import { HttpHeadersBoxSource } from '../HttpHeadersBoxSource';

describe('HttpHeadersBoxSource', () => {
  describe('generateBoxes', () => {
    it('should return [] when no option is provided', async () => {
      const boxes = await HttpHeadersBoxSource.generateBoxes(
        'Content-Type: application/json',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('should return [] for empty input', async () => {
      const boxes = await HttpHeadersBoxSource.generateBoxes('', {
        headers: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('should parse basic headers with ::headers option', async () => {
      const input = 'Content-Type: application/json\nCache-Control: no-cache';
      const boxes = await HttpHeadersBoxSource.generateBoxes(input, {
        headers: true,
      });

      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.['Content-Type']).toBe('application/json');
      expect(boxes[0].props.options?.['Cache-Control']).toBe('no-cache');
    });

    it('should parse basic headers with ::httpheaders option', async () => {
      const input = 'Content-Type: application/json';
      const boxes = await HttpHeadersBoxSource.generateBoxes(input, {
        httpheaders: true,
      });

      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.['Content-Type']).toBe('application/json');
    });

    it('should preserve colons in the value (split on first colon only)', async () => {
      const input = 'Date: Mon, 01 Jan 2024 00:00:00 GMT';
      const boxes = await HttpHeadersBoxSource.generateBoxes(input, {
        headers: true,
      });

      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Date).toBe(
        'Mon, 01 Jan 2024 00:00:00 GMT',
      );
    });

    it('should skip request/status lines that have no colon', async () => {
      const input = 'GET / HTTP/1.1\nHost: example.com';
      const boxes = await HttpHeadersBoxSource.generateBoxes(input, {
        headers: true,
      });

      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Host).toBe('example.com');
      expect(boxes[0].props.options?.['GET / HTTP/1.1']).toBeUndefined();
    });

    it('should merge repeated header names with ", "', async () => {
      const input = 'Set-Cookie: a=1\nSet-Cookie: b=2';
      const boxes = await HttpHeadersBoxSource.generateBoxes(input, {
        headers: true,
      });

      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.['Set-Cookie']).toBe('a=1, b=2');
    });

    it('should return [] when input has no valid header lines', async () => {
      const boxes = await HttpHeadersBoxSource.generateBoxes(
        'just text no colon',
        { headers: true },
      );
      expect(boxes).toHaveLength(0);
    });
  });
});
