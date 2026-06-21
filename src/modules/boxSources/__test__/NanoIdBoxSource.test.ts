import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { NanoIdBoxSource } from '../NanoIdBoxSource';

// default nanoid alphabet — mirrors the source constant for assertion purposes
const ALPHABET =
  'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';

describe('NanoIdBoxSource', () => {
  describe('generateBoxes — trigger conditions', () => {
    it('should return empty array without nanoid option', async () => {
      const boxes = await NanoIdBoxSource.generateBoxes('anything', null);
      expect(boxes).toHaveLength(0);
    });

    it('should return empty array with unrelated options', async () => {
      const boxes = await NanoIdBoxSource.generateBoxes('anything', {
        qr: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes — default length', () => {
    it('should generate a NanoID of length 21 with ::nanoid option (boolean)', async () => {
      const boxes = await NanoIdBoxSource.generateBoxes('', { nanoid: true });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      const id = opts.NanoID;

      expect(id).toHaveLength(21);
      expect(id).toMatch(/^[A-Za-z0-9_-]{21}$/);
      for (const ch of id) {
        expect(ALPHABET).toContain(ch);
      }

      expect(opts.Length).toBe('21');
      expect(opts['Alphabet Size']).toBe('64');
    });

    it('should use KeyValueBoxTemplate', async () => {
      const boxes = await NanoIdBoxSource.generateBoxes('', { nanoid: true });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('should set correct box name and priority', async () => {
      const boxes = await NanoIdBoxSource.generateBoxes('', { nanoid: true });
      expect(boxes[0].props.name).toBe('NanoID');
      expect(boxes[0].props.priority).toBe(10);
    });
  });

  describe('generateBoxes — custom length', () => {
    it('should generate a NanoID of length 10 with ::nanoid=10', async () => {
      const boxes = await NanoIdBoxSource.generateBoxes('', { nanoid: '10' });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.NanoID).toHaveLength(10);
      expect(opts.Length).toBe('10');
    });
  });

  describe('generateBoxes — length clamping', () => {
    it('should clamp ::nanoid=9999 to maximum 512', async () => {
      const boxes = await NanoIdBoxSource.generateBoxes('', { nanoid: '9999' });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.NanoID).toHaveLength(512);
      expect(opts.Length).toBe('512');
    });

    it('should clamp ::nanoid=0 to minimum 1', async () => {
      const boxes = await NanoIdBoxSource.generateBoxes('', { nanoid: '0' });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.NanoID).toHaveLength(1);
      expect(opts.Length).toBe('1');
    });
  });

  describe('generateBoxes — randomness', () => {
    it('should produce different IDs on two consecutive calls', async () => {
      const [a, b] = await Promise.all([
        NanoIdBoxSource.generateBoxes('', { nanoid: true }),
        NanoIdBoxSource.generateBoxes('', { nanoid: true }),
      ]);
      const idA = (a[0].props.options as Record<string, string>).NanoID;
      const idB = (b[0].props.options as Record<string, string>).NanoID;
      expect(idA).not.toBe(idB);
    });
  });

  describe('generateBoxes — secure context fallback', () => {
    it('should return an explanatory box when crypto.getRandomValues is unavailable', async () => {
      const original = globalThis.crypto;
      // @ts-expect-error — intentionally removing crypto to test the fallback
      delete globalThis.crypto;

      try {
        const boxes = await NanoIdBoxSource.generateBoxes('', { nanoid: true });
        expect(boxes).toHaveLength(1);
        expect(boxes[0].props.plaintextOutput).toMatch(/secure context/i);
      } finally {
        globalThis.crypto = original;
      }
    });
  });

  describe('metadata', () => {
    it('should have correct static properties', () => {
      expect(NanoIdBoxSource.name).toBe('NanoID');
      expect(NanoIdBoxSource.tag).toBe('#');
      expect(NanoIdBoxSource.kind).toBe('Generate');
      expect(NanoIdBoxSource.defaultInput).toBe(' ::nanoid');
    });
  });
});
