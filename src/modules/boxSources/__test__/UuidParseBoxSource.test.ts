import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { UuidParseBoxSource } from '../UuidParseBoxSource';

describe('UuidParseBoxSource', () => {
  describe('generateBoxes — option gate', () => {
    it('returns [] when no option is present', async () => {
      const boxes = await UuidParseBoxSource.generateBoxes(
        '550e8400-e29b-41d4-a716-446655440000',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when an unrelated option is present', async () => {
      const boxes = await UuidParseBoxSource.generateBoxes(
        '550e8400-e29b-41d4-a716-446655440000',
        { base64: true },
      );
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes — invalid input', () => {
    it('returns an error box for a non-UUID string', async () => {
      const boxes = await UuidParseBoxSource.generateBoxes('not-a-uuid', {
        uuidparse: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toMatch(/valid UUID/i);
    });

    it('returns an error box for empty input', async () => {
      const boxes = await UuidParseBoxSource.generateBoxes('', {
        uuidparse: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toMatch(/valid UUID/i);
    });
  });

  describe('generateBoxes — v4 UUID', () => {
    const v4 = '550e8400-e29b-41d4-a716-446655440000';

    it('detects version 4', async () => {
      const boxes = await UuidParseBoxSource.generateBoxes(v4, {
        uuidparse: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Version).toBe('4');
    });

    it('detects RFC 4122 variant (char "a" at index 19 → bits 1010)', async () => {
      const boxes = await UuidParseBoxSource.generateBoxes(v4, {
        uuidparse: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Variant).toContain('RFC 4122');
    });

    it('does not include a Timestamp key for v4', async () => {
      const boxes = await UuidParseBoxSource.generateBoxes(v4, {
        uuidparse: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Timestamp).toBeUndefined();
    });

    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await UuidParseBoxSource.generateBoxes(v4, {
        uuidparse: true,
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('also triggers on ::uuidinfo option key', async () => {
      const boxes = await UuidParseBoxSource.generateBoxes(v4, {
        uuidinfo: true,
      });
      expect(boxes).toHaveLength(1);
    });
  });

  describe('generateBoxes — v1 UUID (6ba7b810-9dad-11d1-80b4-00c04fd430c8)', () => {
    // RFC namespace DNS UUID — a real v1 UUID generated circa 1998-02
    const v1 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

    it('detects version 1', async () => {
      const boxes = await UuidParseBoxSource.generateBoxes(v1, {
        uuidparse: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Version).toBe('1');
    });

    it('includes a Timestamp key for v1', async () => {
      const boxes = await UuidParseBoxSource.generateBoxes(v1, {
        uuidparse: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Timestamp).toBeDefined();
    });

    it('decodes the timestamp to ~1998 (RFC namespace UUIDs were generated 1998-02)', async () => {
      const boxes = await UuidParseBoxSource.generateBoxes(v1, {
        uuidparse: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Timestamp).toMatch(/^1998-/);
    });
  });

  describe('generateBoxes — minimal v1 UUID', () => {
    // all-zero except version nibble = 1; variant nibble = 8 (RFC 4122)
    const minV1 = '00000000-0000-1000-8000-000000000000';

    it('detects version 1', async () => {
      const boxes = await UuidParseBoxSource.generateBoxes(minV1, {
        uuidparse: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Version).toBe('1');
    });

    it('includes a Timestamp key', async () => {
      const boxes = await UuidParseBoxSource.generateBoxes(minV1, {
        uuidparse: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Timestamp).toBeDefined();
    });
  });

  describe('generateBoxes — nil UUID', () => {
    const nil = '00000000-0000-0000-0000-000000000000';

    it('reports version as "0 (nil)"', async () => {
      const boxes = await UuidParseBoxSource.generateBoxes(nil, {
        uuidparse: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Version).toContain('0');
      expect(opts.Version).toContain('nil');
    });

    it('does not include a Timestamp key for nil UUID', async () => {
      const boxes = await UuidParseBoxSource.generateBoxes(nil, {
        uuidparse: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Timestamp).toBeUndefined();
    });
  });

  describe('generateBoxes — priority and box name', () => {
    it('sets priority to 10', async () => {
      const boxes = await UuidParseBoxSource.generateBoxes(
        '550e8400-e29b-41d4-a716-446655440000',
        { uuidparse: true },
      );
      expect(boxes[0].props.priority).toBe(10);
    });

    it('names the box "UUID Parse"', async () => {
      const boxes = await UuidParseBoxSource.generateBoxes(
        '550e8400-e29b-41d4-a716-446655440000',
        { uuidparse: true },
      );
      expect(boxes[0].props.name).toBe('UUID Parse');
    });
  });
});
