import { describe, expect, it } from 'vitest';

import { CrockfordBase32BoxSource } from '../CrockfordBase32BoxSource';

describe('CrockfordBase32BoxSource', () => {
  describe('generateBoxes', () => {
    it('returns empty array when no crockford option is present', async () => {
      const boxes = await CrockfordBase32BoxSource.generateBoxes('hello', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array when options object lacks crockford keys', async () => {
      const boxes = await CrockfordBase32BoxSource.generateBoxes('hello', {});
      expect(boxes).toHaveLength(0);
    });

    it('encodes hello to D1JPRV3F', async () => {
      const boxes = await CrockfordBase32BoxSource.generateBoxes('hello', {
        crockford: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Crockford Base32 (Encode)');
      expect(boxes[0].props.plaintextOutput).toBe('D1JPRV3F');
      expect(boxes[0].props.priority).toBe(10);
      expect(boxes[0].props.showExpandButton).toBe(false);
    });

    it('::crockfordencode also triggers encode', async () => {
      const boxes = await CrockfordBase32BoxSource.generateBoxes('hello', {
        crockfordencode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Crockford Base32 (Encode)');
      expect(boxes[0].props.plaintextOutput).toBe('D1JPRV3F');
    });

    it('round-trips hello: decode(encode(hello)) === hello', async () => {
      const encBoxes = await CrockfordBase32BoxSource.generateBoxes('hello', {
        crockford: true,
      });
      const encoded = encBoxes[0].props.plaintextOutput as string;

      const decBoxes = await CrockfordBase32BoxSource.generateBoxes(encoded, {
        crockforddecode: true,
      });
      expect(decBoxes[0].props.plaintextOutput).toBe('hello');
    });

    it('round-trips foobar: decode(encode(foobar)) === foobar', async () => {
      const encBoxes = await CrockfordBase32BoxSource.generateBoxes('foobar', {
        crockford: true,
      });
      const encoded = encBoxes[0].props.plaintextOutput as string;

      const decBoxes = await CrockfordBase32BoxSource.generateBoxes(encoded, {
        crockforddecode: true,
      });
      expect(decBoxes[0].props.plaintextOutput).toBe('foobar');
    });

    it('decode is case-insensitive: lowercase encoded string decodes correctly', async () => {
      // D1JPRV3F in lowercase
      const boxes = await CrockfordBase32BoxSource.generateBoxes('d1jprv3f', {
        crockforddecode: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('hello');
    });

    it('decode normalizes alias I→1: DIJPRV3F decodes as hello', async () => {
      // replace '1' with 'I' (alias for 1 per Crockford spec)
      const boxes = await CrockfordBase32BoxSource.generateBoxes('DIJPRV3F', {
        crockforddecode: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('hello');
    });

    it('decode normalizes alias L→1: DLJPRV3F decodes as hello', async () => {
      const boxes = await CrockfordBase32BoxSource.generateBoxes('DLJPRV3F', {
        crockforddecode: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('hello');
    });

    it('decode normalizes alias O→0: decodes O as 0', async () => {
      // encode '0' → first character of alphabet is '0'
      // '0' byte = 0x30 = 00110000; as 5-bit groups: 00110 00000 → 'C', '0'
      // so '00' encodes to 'C0'; with O alias: 'CO' should decode same as 'C0'
      const refBoxes = await CrockfordBase32BoxSource.generateBoxes('0', {
        crockford: true,
      });
      const encoded = refBoxes[0].props.plaintextOutput as string;
      const withO = encoded.replace('0', 'O');
      const boxes = await CrockfordBase32BoxSource.generateBoxes(withO, {
        crockforddecode: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('0');
    });

    it('decode ignores hyphens used as separators', async () => {
      // D1JPRV3F with hyphens inserted
      const boxes = await CrockfordBase32BoxSource.generateBoxes(
        'D1-JP-RV-3F',
        {
          crockforddecode: true,
        },
      );
      expect(boxes[0].props.plaintextOutput).toBe('hello');
    });

    it('decode returns invalid box for character U (not in alphabet and not an alias)', async () => {
      const boxes = await CrockfordBase32BoxSource.generateBoxes('U', {
        crockforddecode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Crockford Base32 (Decode)');
      expect(boxes[0].props.plaintextOutput).toBe(
        'invalid Crockford Base32 input',
      );
    });

    it('both options produce 2 boxes (encode + decode)', async () => {
      const boxes = await CrockfordBase32BoxSource.generateBoxes('D1JPRV3F', {
        crockford: true,
        crockforddecode: true,
      });
      expect(boxes).toHaveLength(2);
      expect(boxes[0].props.name).toBe('Crockford Base32 (Encode)');
      expect(boxes[1].props.name).toBe('Crockford Base32 (Decode)');
    });

    it('returns empty array when input exceeds MAX_INPUT', async () => {
      const big = 'a'.repeat(100_001);
      const boxes = await CrockfordBase32BoxSource.generateBoxes(big, {
        crockford: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });
});
