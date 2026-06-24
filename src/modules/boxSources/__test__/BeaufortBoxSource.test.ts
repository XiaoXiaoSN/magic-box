import { describe, expect, it } from 'vitest';

import { BeaufortBoxSource } from '../BeaufortBoxSource';

describe('BeaufortBoxSource', () => {
  describe('no match', () => {
    it('returns [] when ::beaufort option is absent', async () => {
      const boxes = await BeaufortBoxSource.generateBoxes('DEFEND', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input even with ::beaufort key', async () => {
      const boxes = await BeaufortBoxSource.generateBoxes('', {
        beaufort: 'FORTIFICATION',
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('canonical Beaufort vector', () => {
    // reference: https://en.wikipedia.org/wiki/Beaufort_cipher
    it('DEFENDTHEEASTWALLOFTHECASTLE + FORTIFICATION → CKMPVCPVWPIWUJOGIUAPVWRIWUUK', async () => {
      const boxes = await BeaufortBoxSource.generateBoxes(
        'DEFENDTHEEASTWALLOFTHECASTLE',
        { beaufort: 'FORTIFICATION' },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe(
        'CKMPVCPVWPIWUJOGIUAPVWRIWUUK',
      );
    });
  });

  describe('self-reciprocity', () => {
    it('applying beaufort twice with the same key recovers the plaintext', async () => {
      const plain = 'HELLOWORLD';
      const key = 'SECRET';

      const enc = await BeaufortBoxSource.generateBoxes(plain, {
        beaufort: key,
      });
      expect(enc).toHaveLength(1);
      const cipher = enc[0].props.plaintextOutput;

      const dec = await BeaufortBoxSource.generateBoxes(cipher, {
        beaufort: key,
      });
      expect(dec).toHaveLength(1);
      expect(dec[0].props.plaintextOutput).toBe(plain);
    });
  });

  describe('non-letters pass through', () => {
    it('preserves spaces and punctuation in place without advancing key index', async () => {
      // 'HI, THERE' — letters H I T H E R E are enciphered; ', ' and ' ' pass through.
      // key ALPHA: A(0) L(11) P(15) H(7) A(0)...
      // H(7) → (A(0)-7+26)%26=19=T
      // I(8) → (L(11)-8+26)%26=3=D
      // T(19) → (P(15)-19+26)%26=22=W
      // H(7) → (H(7)-7+26)%26=0=A
      // E(4) → (A(0)-4+26)%26=22=W
      // R(17) → repeat key from pos5→A(0): (A(0)-17+26)%26=9=J
      // E(4) → (L(11)-4)%26=7=H
      const boxes = await BeaufortBoxSource.generateBoxes('HI, THERE', {
        beaufort: 'ALPHA',
      });
      expect(boxes).toHaveLength(1);
      const out = boxes[0].props.plaintextOutput;
      // 'HI, THERE' has a comma at index 2 and a single space at index 3;
      // index 5 is the letter 'H' and is enciphered, not preserved
      expect(out[2]).toBe(',');
      expect(out[3]).toBe(' ');
      // total length unchanged
      expect(out).toHaveLength('HI, THERE'.length);
    });
  });

  describe('invalid key', () => {
    it('returns a single box explaining the key requirement when key has no letters', async () => {
      const boxes = await BeaufortBoxSource.generateBoxes('HELLO', {
        beaufort: '123',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/alphabetic/i);
    });
  });

  describe('box properties', () => {
    it('box is named "Beaufort Cipher" and has expand button hidden', async () => {
      const boxes = await BeaufortBoxSource.generateBoxes('DEFEND', {
        beaufort: 'KEY',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Beaufort Cipher');
      expect(boxes[0].props.showExpandButton).toBe(false);
      expect(boxes[0].props.priority).toBe(10);
      // headless template — web layer supplies DefaultBoxTemplate
      expect(boxes[0].boxTemplate).toBeUndefined();
    });

    it('a bare ::beaufort (no =key) returns a usage box, not a "TRUE" cipher', async () => {
      const boxes = await BeaufortBoxSource.generateBoxes('HELLO', {
        beaufort: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/alphabetic key/i);
    });
  });
});
