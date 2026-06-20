import { describe, expect, it } from 'vitest';

import { NanoIdBoxSource } from '../NanoIdBoxSource';

const ALPHABET_RE = /^[A-Za-z0-9_-]+$/;

describe('NanoIdBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when ::nanoid option is absent', async () => {
      const boxes = await NanoIdBoxSource.generateBoxes('nanoid', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when options is empty object (no nanoid key)', async () => {
      const boxes = await NanoIdBoxSource.generateBoxes('', {});
      expect(boxes).toHaveLength(0);
    });

    it('generates a 21-char url-safe id for ::nanoid (boolean true)', async () => {
      const boxes = await NanoIdBoxSource.generateBoxes('', { nanoid: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toHaveLength(21);
      expect(boxes[0].props.plaintextOutput).toMatch(ALPHABET_RE);
    });

    it('generates a custom-length id for ::nanoid=10', async () => {
      const boxes = await NanoIdBoxSource.generateBoxes('', {
        nanoid: '10',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toHaveLength(10);
      expect(boxes[0].props.plaintextOutput).toMatch(ALPHABET_RE);
    });

    it('falls back to default length 21 for ::nanoid=0', async () => {
      const boxes = await NanoIdBoxSource.generateBoxes('', { nanoid: '0' });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toHaveLength(21);
    });

    it('falls back to default length 21 for ::nanoid=NaN (non-numeric string)', async () => {
      const boxes = await NanoIdBoxSource.generateBoxes('', {
        nanoid: 'abc',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toHaveLength(21);
    });

    it('falls back to default length 21 for ::nanoid=-5 (negative)', async () => {
      const boxes = await NanoIdBoxSource.generateBoxes('', {
        nanoid: '-5',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toHaveLength(21);
    });

    it('clamps size to MAX_SIZE (256)', async () => {
      const boxes = await NanoIdBoxSource.generateBoxes('', {
        nanoid: '9999',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toHaveLength(256);
    });

    it('ignores input text — only the option drives the trigger', async () => {
      const boxes = await NanoIdBoxSource.generateBoxes('some random text', {
        nanoid: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toHaveLength(21);
    });

    it('produces unique ids across consecutive calls (uniqueness sanity)', async () => {
      const [b1, b2] = await Promise.all([
        NanoIdBoxSource.generateBoxes('', { nanoid: true }),
        NanoIdBoxSource.generateBoxes('', { nanoid: true }),
      ]);
      expect(b1[0].props.plaintextOutput).not.toBe(b2[0].props.plaintextOutput);
    });
  });
});
