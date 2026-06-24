import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { BaconCipherBoxSource } from '../BaconCipherBoxSource';

describe('BaconCipherBoxSource', () => {
  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(BaconCipherBoxSource.name).toBe('Bacon Cipher');
      expect(BaconCipherBoxSource.tag).toBe('#');
      expect(BaconCipherBoxSource.kind).toBe('Encode');
      expect(typeof BaconCipherBoxSource.priority).toBe('number');
    });
  });

  describe('generateBoxes - gate', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await BaconCipherBoxSource.generateBoxes('hello', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty options object', async () => {
      const boxes = await BaconCipherBoxSource.generateBoxes('hello', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when input is empty string with ::bacon', async () => {
      const boxes = await BaconCipherBoxSource.generateBoxes('', {
        bacon: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when input is whitespace only', async () => {
      const boxes = await BaconCipherBoxSource.generateBoxes('   ', {
        bacon: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('encode — individual letters', () => {
    // A = index 0 = 00000 in 5-bit binary → 'aaaaa'
    it("encodes 'A' to 'aaaaa'", async () => {
      const boxes = await BaconCipherBoxSource.generateBoxes('A', {
        bacon: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('aaaaa');
    });

    // B = index 1 = 00001 → 'aaaab'
    it("encodes 'B' to 'aaaab'", async () => {
      const boxes = await BaconCipherBoxSource.generateBoxes('B', {
        bacon: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('aaaab');
    });

    // Z = index 25 = 11001 in 5-bit binary → 'bbaab'
    it("encodes 'Z' to 'bbaab'", async () => {
      const boxes = await BaconCipherBoxSource.generateBoxes('Z', {
        bacon: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('bbaab');
    });
  });

  describe('encode — word', () => {
    // H=7=00111→'aabbb', E=4=00100→'aabaa', L=11=01011→'ababb', O=14=01110→'abbba'
    it("encodes 'hello' to correct 5-char groups separated by spaces", async () => {
      const boxes = await BaconCipherBoxSource.generateBoxes('hello', {
        bacon: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe(
        'aabbb aabaa ababb ababb abbba',
      );
      expect(boxes[0].props.name).toBe('Bacon Cipher (Encode)');
      expect(boxes[0].boxTemplate).toBe(DefaultBoxTemplate);
      expect(boxes[0].props.showExpandButton).toBe(false);
    });

    it('drops non-letter characters during encode', async () => {
      // "A B" → 'aaaaa aaaab' (space in input dropped, codes space-separated)
      const boxes = await BaconCipherBoxSource.generateBoxes('A B', {
        bacon: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('aaaaa aaaab');
    });
  });

  describe('decode', () => {
    it("decodes 'aabbb aabaa ababb ababb abbba' to 'hello'", async () => {
      const boxes = await BaconCipherBoxSource.generateBoxes(
        'aabbb aabaa ababb ababb abbba',
        { bacondecode: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('hello');
      expect(boxes[0].props.name).toBe('Bacon Cipher (Decode)');
      expect(boxes[0].boxTemplate).toBe(DefaultBoxTemplate);
      expect(boxes[0].props.showExpandButton).toBe(false);
    });

    it('decode is case-insensitive for the a/b input', async () => {
      const boxes = await BaconCipherBoxSource.generateBoxes('AAAAA', {
        bacondecode: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('a');
    });

    it('ignores incomplete trailing group', async () => {
      // 'aaaaa' + 'aa' (incomplete) → 'a'
      const boxes = await BaconCipherBoxSource.generateBoxes('aaaaaa a', {
        bacondecode: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('a');
    });
  });

  describe('round-trip', () => {
    it('encode then decode returns the original letters lowercased', async () => {
      const word = 'WORLD';
      const encoded = await BaconCipherBoxSource.generateBoxes(word, {
        bacon: true,
      });
      const encodedText = encoded[0].props.plaintextOutput;

      const decoded = await BaconCipherBoxSource.generateBoxes(encodedText, {
        bacondecode: true,
      });
      expect(decoded[0].props.plaintextOutput).toBe(word.toLowerCase());
    });
  });

  describe('both options', () => {
    it('returns 2 boxes when both ::bacon and ::bacondecode are set', async () => {
      const boxes = await BaconCipherBoxSource.generateBoxes('hello', {
        bacon: true,
        bacondecode: true,
      });
      expect(boxes).toHaveLength(2);
      const names = boxes.map((b) => b.props.name);
      expect(names).toContain('Bacon Cipher (Encode)');
      expect(names).toContain('Bacon Cipher (Decode)');
    });
  });

  describe('::baconencode alias', () => {
    it('responds to ::baconencode the same as ::bacon', async () => {
      const boxes = await BaconCipherBoxSource.generateBoxes('A', {
        baconencode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('aaaaa');
    });
  });
});
