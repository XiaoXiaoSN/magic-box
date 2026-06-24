import { describe, expect, it } from 'vitest';

import { PercentEncodeBoxSource } from '../PercentEncodeBoxSource';

describe('PercentEncodeBoxSource', () => {
  describe('option gating', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await PercentEncodeBoxSource.generateBoxes('a b&c=', null);
      expect(boxes).toEqual([]);
    });

    it('returns [] when an unrelated option is provided', async () => {
      const boxes = await PercentEncodeBoxSource.generateBoxes('a b&c=', {
        sha256: true,
      });
      expect(boxes).toEqual([]);
    });

    it('returns [] for empty input even with option', async () => {
      const boxes = await PercentEncodeBoxSource.generateBoxes('', {
        percentencode: true,
      });
      expect(boxes).toEqual([]);
    });
  });

  describe('encode — ::percentencode', () => {
    it('encodes spaces and special chars', async () => {
      const boxes = await PercentEncodeBoxSource.generateBoxes('a b&c=', {
        percentencode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('a%20b%26c%3D');
    });

    it('strictly escapes RFC 3986 sub-delims: ! ( ) * that encodeURIComponent misses', async () => {
      // encodeURIComponent leaves ! ' ( ) * unescaped; we must escape them too
      const boxes = await PercentEncodeBoxSource.generateBoxes('a(b)*c!', {
        percentencode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('a%28b%29%2Ac%21');
    });

    it("strictly escapes single-quote '", async () => {
      const boxes = await PercentEncodeBoxSource.generateBoxes("it's", {
        percentencode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('it%27s');
    });

    it('encodes unicode characters', async () => {
      const boxes = await PercentEncodeBoxSource.generateBoxes('日本', {
        percentencode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('%E6%97%A5%E6%9C%AC');
    });

    it('accepts ::urlencode alias', async () => {
      const boxes = await PercentEncodeBoxSource.generateBoxes('a b', {
        urlencode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('a%20b');
    });

    it('box name is "Percent Encode"', async () => {
      const boxes = await PercentEncodeBoxSource.generateBoxes('x', {
        percentencode: true,
      });
      expect(boxes[0].props.name).toBe('Percent Encode');
    });

    it('showExpandButton is false', async () => {
      const boxes = await PercentEncodeBoxSource.generateBoxes('x', {
        percentencode: true,
      });
      expect(boxes[0].props.showExpandButton).toBe(false);
    });
  });

  describe('decode — ::percentdecode', () => {
    it('decodes a percent-encoded string', async () => {
      const boxes = await PercentEncodeBoxSource.generateBoxes('a%20b%26c%3D', {
        percentdecode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('a b&c=');
    });

    it('returns a descriptive box on malformed input', async () => {
      const boxes = await PercentEncodeBoxSource.generateBoxes('%ZZ', {
        percentdecode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(
        /invalid percent-encoding/i,
      );
    });

    it('box name is "Percent Decode"', async () => {
      const boxes = await PercentEncodeBoxSource.generateBoxes('hello', {
        percentdecode: true,
      });
      expect(boxes[0].props.name).toBe('Percent Decode');
    });

    it('showExpandButton is false', async () => {
      const boxes = await PercentEncodeBoxSource.generateBoxes('hello', {
        percentdecode: true,
      });
      expect(boxes[0].props.showExpandButton).toBe(false);
    });
  });

  describe('round-trip', () => {
    it('encodes then decodes back to the original', async () => {
      const original = 'hello world! (test)';
      const encoded = await PercentEncodeBoxSource.generateBoxes(original, {
        percentencode: true,
      });
      const encodedStr = encoded[0].props.plaintextOutput;

      const decoded = await PercentEncodeBoxSource.generateBoxes(encodedStr, {
        percentdecode: true,
      });
      expect(decoded[0].props.plaintextOutput).toBe(original);
    });
  });
});
