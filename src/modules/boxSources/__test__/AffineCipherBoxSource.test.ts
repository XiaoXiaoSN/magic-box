import { describe, expect, it } from 'vitest';

import { AffineCipherBoxSource } from '../AffineCipherBoxSource';

describe('AffineCipherBoxSource', () => {
  describe('no option → empty', () => {
    it('returns [] when no affine option is provided', async () => {
      const boxes = await AffineCipherBoxSource.generateBoxes('HELLO', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty options object', async () => {
      const boxes = await AffineCipherBoxSource.generateBoxes('HELLO', {});
      expect(boxes).toHaveLength(0);
    });
  });

  describe('empty input → empty', () => {
    it('returns [] when input is empty string', async () => {
      const boxes = await AffineCipherBoxSource.generateBoxes('', {
        affine: '5,8',
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('encrypt — canonical Wikipedia vector (a=5, b=8)', () => {
    it('encrypts AFFINECIPHER to IHHWVCSWFRCP', async () => {
      // wikipedia affine cipher example: a=5 b=8
      const boxes = await AffineCipherBoxSource.generateBoxes('AFFINECIPHER', {
        affine: '5,8',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('IHHWVCSWFRCP');
      expect(boxes[0].props.name).toBe('Affine Cipher (Encrypt)');
    });
  });

  describe('decrypt — canonical Wikipedia vector (a=5, b=8)', () => {
    it('decrypts IHHWVCSWFRCP back to AFFINECIPHER', async () => {
      const boxes = await AffineCipherBoxSource.generateBoxes('IHHWVCSWFRCP', {
        affinedecode: '5,8',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('AFFINECIPHER');
      expect(boxes[0].props.name).toBe('Affine Cipher (Decrypt)');
    });
  });

  describe('case and punctuation preservation', () => {
    it('round-trips mixed-case text with punctuation', async () => {
      const plain = 'Hi, There!';
      const encrypted = await AffineCipherBoxSource.generateBoxes(plain, {
        affine: '5,8',
      });
      expect(encrypted).toHaveLength(1);
      const ciphertext = encrypted[0].props.plaintextOutput;

      // comma, space, and exclamation must pass through unchanged
      expect(ciphertext[2]).toBe(',');
      expect(ciphertext[3]).toBe(' ');
      expect(ciphertext[ciphertext.length - 1]).toBe('!');

      const decrypted = await AffineCipherBoxSource.generateBoxes(ciphertext, {
        affinedecode: '5,8',
      });
      expect(decrypted).toHaveLength(1);
      expect(decrypted[0].props.plaintextOutput).toBe(plain);
    });
  });

  describe('invalid a (not coprime with 26)', () => {
    it('returns an error box mentioning coprime when a=2', async () => {
      const boxes = await AffineCipherBoxSource.generateBoxes('HELLO', {
        affine: '2,3',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput.toLowerCase()).toMatch(/coprime/);
    });
  });

  describe('malformed option value', () => {
    it('returns an error box mentioning format a,b for non-numeric input', async () => {
      const boxes = await AffineCipherBoxSource.generateBoxes('HELLO', {
        affine: 'abc',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput.toLowerCase()).toMatch(/a,b/);
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(AffineCipherBoxSource.name).toBe('Affine Cipher');
      expect(AffineCipherBoxSource.kind).toBe('Encode');
      expect(typeof AffineCipherBoxSource.priority).toBe('number');
    });
  });
});
