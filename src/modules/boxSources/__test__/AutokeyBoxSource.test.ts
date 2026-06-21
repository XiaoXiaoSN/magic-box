import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { AutokeyBoxSource } from '../AutokeyBoxSource';

describe('AutokeyBoxSource', () => {
  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(AutokeyBoxSource.name).toBe('Autokey Cipher');
      expect(AutokeyBoxSource.tag).toBe('#');
      expect(AutokeyBoxSource.kind).toBe('Encode');
      expect(typeof AutokeyBoxSource.priority).toBe('number');
    });
  });

  describe('generateBoxes - no option', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await AutokeyBoxSource.generateBoxes('ATTACKATDAWN', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await AutokeyBoxSource.generateBoxes('ATTACKATDAWN', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty input', async () => {
      const boxes = await AutokeyBoxSource.generateBoxes('', {
        autokey: 'QUEENLY',
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - encrypt canonical Wikipedia vector', () => {
    // plaintext ATTACKATDAWN, key QUEENLY
    // keystream = QUEENLY + ATTACKATDAWN = QUEENLYATTACKDAWN...
    // first 12: Q U E E N L Y A T T A C
    // A+Q=Q, T+U=N, T+E=X, A+E=E, C+N=P, K+L=V, A+Y=Y, T+A=T, D+T=W, A+T=T, W+A=W, N+C=P
    // ciphertext: QNXEPVYTWTWP
    it('encrypts ATTACKATDAWN with key QUEENLY to QNXEPVYTWTWP', async () => {
      const boxes = await AutokeyBoxSource.generateBoxes('ATTACKATDAWN', {
        autokey: 'QUEENLY',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Autokey Cipher (Encrypt)');
      expect(boxes[0].props.plaintextOutput).toBe('QNXEPVYTWTWP');
      expect(boxes[0].boxTemplate).toBe(DefaultBoxTemplate);
      expect(boxes[0].props.showExpandButton).toBe(false);
    });
  });

  describe('generateBoxes - decrypt canonical Wikipedia vector', () => {
    it('decrypts QNXEPVYTWTWP with key QUEENLY to ATTACKATDAWN', async () => {
      const boxes = await AutokeyBoxSource.generateBoxes('QNXEPVYTWTWP', {
        autokeydecode: 'QUEENLY',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Autokey Cipher (Decrypt)');
      expect(boxes[0].props.plaintextOutput).toBe('ATTACKATDAWN');
      expect(boxes[0].boxTemplate).toBe(DefaultBoxTemplate);
      expect(boxes[0].props.showExpandButton).toBe(false);
    });
  });

  describe('generateBoxes - case preservation and round-trip with punctuation', () => {
    it('round-trips "Hello, World!" with key KEY', async () => {
      const original = 'Hello, World!';
      const encBoxes = await AutokeyBoxSource.generateBoxes(original, {
        autokey: 'KEY',
      });
      expect(encBoxes).toHaveLength(1);
      const ciphertext = encBoxes[0].props.plaintextOutput;

      const decBoxes = await AutokeyBoxSource.generateBoxes(ciphertext, {
        autokeydecode: 'KEY',
      });
      expect(decBoxes).toHaveLength(1);
      // punctuation and spaces pass through unchanged; letters round-trip
      expect(decBoxes[0].props.plaintextOutput).toBe(original);
    });

    it('preserves non-letter characters in position', async () => {
      // comma and space must appear at indices 5 and 6 of "Hello, World!"
      const encBoxes = await AutokeyBoxSource.generateBoxes('Hello, World!', {
        autokey: 'KEY',
      });
      const cipher = encBoxes[0].props.plaintextOutput;
      expect(cipher[5]).toBe(',');
      expect(cipher[6]).toBe(' ');
      expect(cipher[12]).toBe('!');
    });
  });

  describe('generateBoxes - bare option (no key value) → usage box', () => {
    it('returns usage box when ::autokey is bare boolean true', async () => {
      const boxes = await AutokeyBoxSource.generateBoxes('ATTACKATDAWN', {
        autokey: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Autokey Cipher (Encrypt)');
      // usage box contains instructions, not ciphertext
      expect(boxes[0].props.plaintextOutput).toMatch(/usage/i);
    });

    it('returns usage box when ::autokeydecode is bare boolean true', async () => {
      const boxes = await AutokeyBoxSource.generateBoxes('QNXEPVYTWTWP', {
        autokeydecode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Autokey Cipher (Decrypt)');
      expect(boxes[0].props.plaintextOutput).toMatch(/usage/i);
    });
  });

  describe('generateBoxes - key with no letters → usage box', () => {
    it('returns usage box when key contains only digits', async () => {
      const boxes = await AutokeyBoxSource.generateBoxes('ATTACKATDAWN', {
        autokey: '123',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/usage/i);
    });

    it('returns usage box for decrypt when key contains only digits', async () => {
      const boxes = await AutokeyBoxSource.generateBoxes('QNXEPVYTWTWP', {
        autokeydecode: '456',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/usage/i);
    });
  });

  describe('generateBoxes - both options → 2 boxes', () => {
    it('returns encrypt box then decrypt box when both options are set', async () => {
      const boxes = await AutokeyBoxSource.generateBoxes('ATTACKATDAWN', {
        autokey: 'QUEENLY',
        autokeydecode: 'QUEENLY',
      });
      expect(boxes).toHaveLength(2);
      expect(boxes[0].props.name).toBe('Autokey Cipher (Encrypt)');
      expect(boxes[1].props.name).toBe('Autokey Cipher (Decrypt)');
    });
  });

  describe('generateBoxes - autokeyencode alias', () => {
    it('::autokeyencode=KEY works identically to ::autokey=KEY', async () => {
      const via_autokey = await AutokeyBoxSource.generateBoxes('ATTACKATDAWN', {
        autokey: 'QUEENLY',
      });
      const via_autokeyencode = await AutokeyBoxSource.generateBoxes(
        'ATTACKATDAWN',
        { autokeyencode: 'QUEENLY' },
      );
      expect(via_autokeyencode[0].props.plaintextOutput).toBe(
        via_autokey[0].props.plaintextOutput,
      );
    });
  });
});
