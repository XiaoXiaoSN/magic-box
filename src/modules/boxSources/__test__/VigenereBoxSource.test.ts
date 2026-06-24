import { describe, expect, it } from 'vitest';

import { VigenereBoxSource } from '../VigenereBoxSource';

describe('VigenereBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when no option is given', async () => {
      const boxes = await VigenereBoxSource.generateBoxes('attackatdawn');
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input even with a valid option', async () => {
      const boxes = await VigenereBoxSource.generateBoxes('', {
        vigenere: 'lemon',
      });
      expect(boxes).toHaveLength(0);
    });

    it('encrypts attackatdawn with key lemon → lxfopvefrnhr (canonical vector)', async () => {
      const boxes = await VigenereBoxSource.generateBoxes('attackatdawn', {
        vigenere: 'lemon',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Vigenere (Encrypt)');
      expect(boxes[0].props.plaintextOutput).toBe('lxfopvefrnhr');
    });

    it('decrypts lxfopvefrnhr with key lemon → attackatdawn', async () => {
      const boxes = await VigenereBoxSource.generateBoxes('lxfopvefrnhr', {
        vigeneredecode: 'lemon',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Vigenere (Decrypt)');
      expect(boxes[0].props.plaintextOutput).toBe('attackatdawn');
    });

    it('preserves case and non-letter characters unchanged', async () => {
      const boxes = await VigenereBoxSource.generateBoxes('Hello, World!', {
        vigenere: 'key',
      });
      expect(boxes).toHaveLength(1);
      const output = boxes[0].props.plaintextOutput;
      // comma, space, and exclamation mark must survive intact
      expect(output[5]).toBe(',');
      expect(output[6]).toBe(' ');
      expect(output[12]).toBe('!');
      // first letter 'H' is uppercase, so output letter must also be uppercase
      expect(output[0]).toMatch(/[A-Z]/);
    });

    it('round-trips Hello, World! through encrypt then decrypt', async () => {
      const plain = 'Hello, World!';
      const [encBox] = await VigenereBoxSource.generateBoxes(plain, {
        vigenere: 'key',
      });
      const [decBox] = await VigenereBoxSource.generateBoxes(
        encBox.props.plaintextOutput,
        { vigeneredecode: 'key' },
      );
      expect(decBox.props.plaintextOutput).toBe(plain);
    });

    it('returns an error box when the key contains no alphabetic characters', async () => {
      const boxes = await VigenereBoxSource.generateBoxes('hello', {
        vigenere: '123',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/alphabetic/i);
    });

    it('round-trips a mixed-case sentence', async () => {
      const plain = 'The Quick Brown Fox Jumps Over The Lazy Dog!';
      const [encBox] = await VigenereBoxSource.generateBoxes(plain, {
        vigenere: 'Secret',
      });
      const [decBox] = await VigenereBoxSource.generateBoxes(
        encBox.props.plaintextOutput,
        { vigeneredecode: 'Secret' },
      );
      expect(decBox.props.plaintextOutput).toBe(plain);
    });

    it('aliases vigenereencode as an encrypt trigger', async () => {
      const boxes = await VigenereBoxSource.generateBoxes('attackatdawn', {
        vigenereencode: 'lemon',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Vigenere (Encrypt)');
      expect(boxes[0].props.plaintextOutput).toBe('lxfopvefrnhr');
    });
  });
});
