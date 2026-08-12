import { describe, expect, it } from 'vitest';

import { UlidBoxSource } from '../UlidBoxSource';

// canonical ULID from the ULID spec — timestamp encodes 1469922850259 ms
const CANONICAL_ULID = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
const CANONICAL_TS_MS = 1469922850259;
const CANONICAL_ISO = '2016-07-30T23:54:10.259Z';

// valid Crockford base32 alphabet (26 chars, uppercase)
const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/;

describe('UlidBoxSource', () => {
  describe('no matching option', () => {
    it('returns [] when no relevant option is present', async () => {
      const boxes = await UlidBoxSource.generateBoxes('', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when unrelated options are present', async () => {
      const boxes = await UlidBoxSource.generateBoxes('', { foo: true });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generate path', () => {
    it('generates a 26-char Crockford base32 ULID', async () => {
      const boxes = await UlidBoxSource.generateBoxes('', { ulid: true });
      expect(boxes).toHaveLength(1);

      const ulid = (boxes[0].props.options as Record<string, string>).ULID;
      expect(ulid).toMatch(ULID_REGEX);
    });

    it('Unix (ms) is within a few seconds of Date.now()', async () => {
      const before = Date.now();
      const boxes = await UlidBoxSource.generateBoxes('', { ulid: true });
      const after = Date.now();

      const ms = Number.parseInt(
        (boxes[0].props.options as Record<string, string>)['Unix (ms)'],
        10,
      );
      expect(ms).toBeGreaterThanOrEqual(before);
      expect(ms).toBeLessThanOrEqual(after + 1000);
    });

    it('two consecutive calls produce different ULIDs', async () => {
      const [b1, b2] = await Promise.all([
        UlidBoxSource.generateBoxes('', { ulid: true }),
        UlidBoxSource.generateBoxes('', { ulid: true }),
      ]);

      const u1 = (b1[0].props.options as Record<string, string>).ULID;
      const u2 = (b2[0].props.options as Record<string, string>).ULID;
      expect(u1).not.toBe(u2);
    });

    it('Timestamp is a valid ISO string', async () => {
      const boxes = await UlidBoxSource.generateBoxes('', { ulidparse: true });
      const ts = (boxes[0].props.options as Record<string, string>).Timestamp;
      expect(() => new Date(ts).toISOString()).not.toThrow();
    });
  });

  describe('decode path', () => {
    it('decodes the canonical ULID timestamp to 1469922850259 ms', async () => {
      const boxes = await UlidBoxSource.generateBoxes(CANONICAL_ULID, {
        ulid: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Unix (ms)']).toBe(CANONICAL_TS_MS.toString());
    });

    it('decodes the canonical ULID to the correct ISO timestamp', async () => {
      const boxes = await UlidBoxSource.generateBoxes(CANONICAL_ULID, {
        ulid: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Timestamp).toBe(CANONICAL_ISO);
    });

    it('normalises the decoded ULID to uppercase', async () => {
      const boxes = await UlidBoxSource.generateBoxes(CANONICAL_ULID, {
        ulid: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.ULID).toBe(CANONICAL_ULID.toUpperCase());
    });

    it('decode is case-insensitive', async () => {
      const boxes = await UlidBoxSource.generateBoxes(
        CANONICAL_ULID.toLowerCase(),
        { ulid: true },
      );
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Unix (ms)']).toBe(CANONICAL_TS_MS.toString());
    });

    it('uses KeyValueBoxTemplate for decoded output', async () => {
      const boxes = await UlidBoxSource.generateBoxes(CANONICAL_ULID, {
        ulid: true,
      });
      expect(boxes[0].boxTemplate).toBeDefined();
    });

    it('box name is ULID', async () => {
      const boxes = await UlidBoxSource.generateBoxes(CANONICAL_ULID, {
        ulid: true,
      });
      expect(boxes[0].props.name).toBe('ULID');
    });
  });
});
