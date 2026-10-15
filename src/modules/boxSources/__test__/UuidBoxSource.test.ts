import { afterEach, expect, vi } from 'vitest';

import { UuidBoxSource } from '../UuidBoxSource';

describe('UuidBoxSource', () => {
  const validUUIDv4Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  describe('checkMatch', () => {
    it('should match "uuid" command', () => {
      let match = UuidBoxSource.checkMatch('uuid');
      expect(match).toBeDefined();

      match = UuidBoxSource.checkMatch('uuid  ');
      expect(match).toBeDefined();

      match = UuidBoxSource.checkMatch('  uuid ');
      expect(match).toBeDefined();
    });

    it('should match case-insensitive', () => {
      const match = UuidBoxSource.checkMatch('UUID');
      expect(match).toBeDefined();
    });

    it('should not match invalid formats', () => {
      expect(UuidBoxSource.checkMatch('uuidv4')).toBeUndefined();
      expect(UuidBoxSource.checkMatch('guid')).toBeUndefined();
      expect(UuidBoxSource.checkMatch('')).toBeUndefined();
      expect(UuidBoxSource.checkMatch('random-uuid')).toBeUndefined();
    });

    it('matches strict UUID text for inspection', () => {
      expect(
        UuidBoxSource.checkMatch('01890f81-7b9d-7ef0-8000-000000000000'),
      ).toBeDefined();
      expect(
        UuidBoxSource.checkMatch('01890f817b9d7ef08000000000000000'),
      ).toBeUndefined();
    });
  });

  describe('generateBoxes', () => {
    it('should return empty array for non-matching input', async () => {
      const boxes = await UuidBoxSource.generateBoxes('not a uuid command');
      expect(boxes).toHaveLength(0);
    });

    it('should generate valid UUID box for matching input', async () => {
      const boxes = await UuidBoxSource.generateBoxes('uuid');
      expect(boxes).toHaveLength(1);

      const box = boxes[0];
      expect(box.props.name).toBe('UUID');
      expect(box.props.plaintextOutput).toMatch(validUUIDv4Regex);
      expect(box.props.plaintextOutput.length).toBe(36);
      expect(box.boxTemplate).toBeUndefined();
    });

    it('should generate different UUIDs for each call', async () => {
      const boxes1 = await UuidBoxSource.generateBoxes('uuid');
      const boxes2 = await UuidBoxSource.generateBoxes('uuid');

      expect(boxes1[0].props.plaintextOutput).not.toBe(
        boxes2[0].props.plaintextOutput,
      );
    });

    describe('case sensitivity', () => {
      it('should generate lowercase UUID for lowercase input', async () => {
        const boxes = await UuidBoxSource.generateBoxes('uuid');
        expect(boxes[0].props.plaintextOutput).toMatch(/^[0-9a-f-]+$/);
      });

      it('should generate uppercase UUID for uppercase input', async () => {
        const boxes = await UuidBoxSource.generateBoxes('UUID', {
          uppercase: true,
        });
        expect(boxes[0].props.plaintextOutput).toMatch(/^[0-9A-F-]+$/);
      });
    });

    it('generates nil, max, and v7 command forms', async () => {
      const nil = await UuidBoxSource.generateBoxes('uuid nil');
      const max = await UuidBoxSource.generateBoxes('uuid max');
      const v7 = await UuidBoxSource.generateBoxes('uuid v7');

      expect(nil[0].props.plaintextOutput).toBe(
        '00000000-0000-0000-0000-000000000000',
      );
      expect(max[0].props.plaintextOutput).toBe(
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
      );
      expect(v7[0].props.options?.Version).toBe('7');
      expect(v7[0].props.options?.Variant).toBe('RFC 9562');
    });

    it('ignores inherited formatting options', async () => {
      const inherited = Object.create({ uppercase: true }) as Record<
        string,
        string | boolean
      >;
      const [box] = await UuidBoxSource.generateBoxes('uuid max', inherited);
      expect(box.props.plaintextOutput).toBe(
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
      );
    });

    it('decodes version, variant, and v7 milliseconds', async () => {
      const boxes = await UuidBoxSource.generateBoxes(
        '00000000-0000-7000-8000-000000000000',
      );
      const options = boxes[0].props.options as Record<string, string>;
      expect(options.Version).toBe('7');
      expect(options.Variant).toBe('RFC 9562');
      expect(options['Unix (ms)']).toBe('0');
      expect(options.Timestamp).toBe('1970-01-01T00:00:00.000Z');
    });

    it('decodes v1 Gregorian timestamps but not non-RFC variants', async () => {
      const v1 = await UuidBoxSource.generateBoxes(
        'f47ac10b-58cc-11cf-8f0f-00aa006c42c6',
      );
      const v1Options = v1[0].props.options as Record<string, string>;
      expect(v1Options.Version).toBe('1');
      expect(v1Options.Variant).toBe('RFC 9562');
      expect(v1Options.Timestamp).toBeDefined();

      const nonRfc = await UuidBoxSource.generateBoxes(
        'f47ac10b-58cc-11cf-0f0f-00aa006c42c6',
      );
      expect(nonRfc[0].props.options?.Timestamp).toBeUndefined();
    });

    it('rejects insecure v7 generation when Web Crypto is unavailable', async () => {
      const originalGetRandomValues = crypto.getRandomValues;
      Object.defineProperty(crypto, 'getRandomValues', {
        value: undefined,
        configurable: true,
      });
      try {
        const boxes = await UuidBoxSource.generateBoxes('uuid v7');
        expect(boxes[0].props.plaintextOutput).toMatch(/secure web crypto/i);
      } finally {
        Object.defineProperty(crypto, 'getRandomValues', {
          value: originalGetRandomValues,
          configurable: true,
        });
      }
    });

    describe('crypto fallback paths', () => {
      // save originals
      const originalRandomUUID = crypto.randomUUID;
      const originalGetRandomValues = crypto.getRandomValues;

      afterEach(() => {
        // restore after each test
        Object.defineProperty(crypto, 'randomUUID', {
          value: originalRandomUUID,
          writable: true,
          configurable: true,
        });
        Object.defineProperty(crypto, 'getRandomValues', {
          value: originalGetRandomValues,
          writable: true,
          configurable: true,
        });
      });

      it('falls back to getRandomValues when randomUUID is undefined, producing a valid v4 UUID', async () => {
        Object.defineProperty(crypto, 'randomUUID', {
          value: undefined,
          writable: true,
          configurable: true,
        });

        const boxes = await UuidBoxSource.generateBoxes('uuid');
        expect(boxes).toHaveLength(1);
        expect(boxes[0].props.plaintextOutput).toMatch(validUUIDv4Regex);
      });

      it('falls back to Math.random when both randomUUID and getRandomValues are undefined, producing a valid v4 UUID', async () => {
        Object.defineProperty(crypto, 'randomUUID', {
          value: undefined,
          writable: true,
          configurable: true,
        });
        Object.defineProperty(crypto, 'getRandomValues', {
          value: undefined,
          writable: true,
          configurable: true,
        });

        const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);

        const boxes = await UuidBoxSource.generateBoxes('uuid');
        expect(boxes).toHaveLength(1);
        expect(boxes[0].props.plaintextOutput).toMatch(validUUIDv4Regex);

        mathRandomSpy.mockRestore();
      });
    });
  });
});
