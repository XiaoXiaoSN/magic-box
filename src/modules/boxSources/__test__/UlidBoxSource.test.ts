import { describe, expect, it } from 'vitest';

import { UlidBoxSource } from '../UlidBoxSource';

// valid Crockford base32 alphabet: digits + uppercase minus I, L, O, U
const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/;

describe('UlidBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns empty array when ::ulid option is absent', async () => {
      const boxes = await UlidBoxSource.generateBoxes('', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns 1 box with a 26-char Crockford base32 output when ::ulid is set', async () => {
      const boxes = await UlidBoxSource.generateBoxes('', { ulid: true });
      expect(boxes).toHaveLength(1);

      const output = boxes[0].props.plaintextOutput;
      expect(output).toHaveLength(26);
      expect(output).toMatch(ULID_REGEX);
    });

    it('produces different ULIDs on consecutive calls', async () => {
      const [a, b] = await Promise.all([
        UlidBoxSource.generateBoxes('', { ulid: true }),
        UlidBoxSource.generateBoxes('', { ulid: true }),
      ]);
      // statistically impossible to collide; guards against a frozen-clock + fixed-random bug
      expect(a[0].props.plaintextOutput).not.toBe(b[0].props.plaintextOutput);
    });

    it('time component (first 10 chars) contains only valid Crockford alphabet chars', async () => {
      const boxes = await UlidBoxSource.generateBoxes('', { ulid: true });
      const timeComponent = boxes[0].props.plaintextOutput.slice(0, 10);
      expect(timeComponent).toMatch(/^[0-9A-HJKMNP-TV-Z]{10}$/);
    });
  });
});
