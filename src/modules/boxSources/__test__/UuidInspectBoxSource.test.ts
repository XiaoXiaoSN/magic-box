import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';
import { UuidInspectBoxSource } from '../UuidInspectBoxSource';

describe('UuidInspectBoxSource', () => {
  describe('metadata', () => {
    it('has correct static properties', () => {
      expect(UuidInspectBoxSource.name).toBe('UUID Inspect');
      expect(UuidInspectBoxSource.tag).toBe('#');
      expect(UuidInspectBoxSource.kind).toBe('Analyze');
      expect(UuidInspectBoxSource.priority).toBe(20);
    });
  });

  describe('option gating', () => {
    it('returns [] when no options are provided', async () => {
      const boxes = await UuidInspectBoxSource.generateBoxes(
        '550e8400-e29b-41d4-a716-446655440000',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when an unrelated option is provided', async () => {
      const boxes = await UuidInspectBoxSource.generateBoxes(
        '550e8400-e29b-41d4-a716-446655440000',
        { base64: true },
      );
      expect(boxes).toHaveLength(0);
    });

    it('triggers on ::uuidinfo', async () => {
      const boxes = await UuidInspectBoxSource.generateBoxes(
        '550e8400-e29b-41d4-a716-446655440000',
        { uuidinfo: true },
      );
      expect(boxes).toHaveLength(1);
    });

    it('triggers on ::uuidinspect', async () => {
      const boxes = await UuidInspectBoxSource.generateBoxes(
        '550e8400-e29b-41d4-a716-446655440000',
        { uuidinspect: true },
      );
      expect(boxes).toHaveLength(1);
    });
  });

  describe('input validation', () => {
    it('returns [] for a plain string', async () => {
      const boxes = await UuidInspectBoxSource.generateBoxes('not-a-uuid', {
        uuidinfo: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for a too-short hex string', async () => {
      const boxes = await UuidInspectBoxSource.generateBoxes(
        '550e8400-e29b-41d4-a716',
        {
          uuidinfo: true,
        },
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for a UUID missing hyphens', async () => {
      const boxes = await UuidInspectBoxSource.generateBoxes(
        '550e8400e29b41d4a716446655440000',
        { uuidinfo: true },
      );
      expect(boxes).toHaveLength(0);
    });
  });

  describe('v4 UUID (::uuidinfo)', () => {
    it('reports Version starting with "4" and Variant "RFC 4122"', async () => {
      // the 'a' in 'a716' → high bits 1010 → RFC 4122
      const boxes = await UuidInspectBoxSource.generateBoxes(
        '550e8400-e29b-41d4-a716-446655440000',
        { uuidinfo: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        UUID: '550e8400-e29b-41d4-a716-446655440000',
        Version: expect.stringMatching(/^4/),
        Variant: 'RFC 4122',
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });
  });

  describe('v1 UUID', () => {
    it('reports Version starting with "1"', async () => {
      // 3rd group starts with '1' → version 1
      const boxes = await UuidInspectBoxSource.generateBoxes(
        'f47ac10b-58cc-1372-8567-0e02b2c3d479',
        { uuidinfo: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Version: expect.stringMatching(/^1/),
      });
    });
  });

  describe('nil UUID', () => {
    it('reports Version "nil" and Variant "nil"', async () => {
      const boxes = await UuidInspectBoxSource.generateBoxes(
        '00000000-0000-0000-0000-000000000000',
        { uuidinfo: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        UUID: '00000000-0000-0000-0000-000000000000',
        Version: 'nil',
        Variant: 'nil',
      });
    });
  });

  describe('priority', () => {
    it('sets priority to 20', async () => {
      const boxes = await UuidInspectBoxSource.generateBoxes(
        '550e8400-e29b-41d4-a716-446655440000',
        { uuidinfo: true },
      );
      expect(boxes[0].props.priority).toBe(20);
    });
  });

  describe('case normalization', () => {
    it('normalizes UUID to lowercase', async () => {
      const boxes = await UuidInspectBoxSource.generateBoxes(
        '550E8400-E29B-41D4-A716-446655440000',
        { uuidinfo: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        UUID: '550e8400-e29b-41d4-a716-446655440000',
      });
    });
  });
});
