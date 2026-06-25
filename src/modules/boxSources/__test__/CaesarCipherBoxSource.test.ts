import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { CaesarCipherBoxSource } from '../CaesarCipherBoxSource';

describe('CaesarCipherBoxSource', () => {
  describe('no option', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await CaesarCipherBoxSource.generateBoxes(
        'Hello, World!',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await CaesarCipherBoxSource.generateBoxes(
        'Hello, World!',
        {},
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty input with rot13 option', async () => {
      const boxes = await CaesarCipherBoxSource.generateBoxes('', {
        rot13: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('rot13', () => {
    it('encodes Hello, World! correctly', async () => {
      const boxes = await CaesarCipherBoxSource.generateBoxes('Hello, World!', {
        rot13: true,
      });
      expect(boxes).toHaveLength(2);
      expect(boxes[0].props.plaintextOutput).toBe('Uryyb, Jbeyq!');
      expect(boxes[0].props.name).toBe('Caesar Cipher (ROT13 Encode)');
      expect(boxes[0].boxTemplate).toBe(DefaultBoxTemplate);

      expect(boxes[1].props.plaintextOutput).toBe('Uryyb, Jbeyq!');
      expect(boxes[1].props.name).toBe('Caesar Cipher (ROT13 Decode)');
      expect(boxes[1].boxTemplate).toBe(DefaultBoxTemplate);
    });

    it('is its own inverse — applying rot13 twice returns the original', async () => {
      const input = 'Hello, World!';
      const first = await CaesarCipherBoxSource.generateBoxes(input, {
        rot13: true,
      });
      const rotated = first[0].props.plaintextOutput;
      const second = await CaesarCipherBoxSource.generateBoxes(rotated, {
        rot13: true,
      });
      expect(second[0].props.plaintextOutput).toBe(input);
    });

    it('supports encode specific option', async () => {
      const boxes = await CaesarCipherBoxSource.generateBoxes('Hello, World!', {
        rot13: 'encode',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Caesar Cipher (ROT13 Encode)');
      expect(boxes[0].props.plaintextOutput).toBe('Uryyb, Jbeyq!');
    });

    it('supports decode specific option', async () => {
      const boxes = await CaesarCipherBoxSource.generateBoxes('Hello, World!', {
        rot13: 'decode',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Caesar Cipher (ROT13 Decode)');
      expect(boxes[0].props.plaintextOutput).toBe('Uryyb, Jbeyq!');
    });
  });

  describe('caesar shift', () => {
    it('shifts abc by 1 to bcd (encode) and wraps to zab (decode)', async () => {
      const boxes = await CaesarCipherBoxSource.generateBoxes('abc', {
        caesar: '1',
      });
      expect(boxes).toHaveLength(2);
      expect(boxes[0].props.plaintextOutput).toBe('bcd');
      expect(boxes[0].props.name).toBe('Caesar Cipher (shift 1) Encode');

      expect(boxes[1].props.plaintextOutput).toBe('zab');
      expect(boxes[1].props.name).toBe('Caesar Cipher (shift -1) Decode');
    });

    it('wraps xyz by 3 to abc (encode) and uvw (decode)', async () => {
      const boxes = await CaesarCipherBoxSource.generateBoxes('xyz', {
        caesar: '3',
      });
      expect(boxes).toHaveLength(2);
      expect(boxes[0].props.plaintextOutput).toBe('abc');
      expect(boxes[1].props.plaintextOutput).toBe('uvw');
    });

    it('negative shift -1 on bcd returns abc (encode) and cde (decode)', async () => {
      const boxes = await CaesarCipherBoxSource.generateBoxes('bcd', {
        caesar: '-1',
      });
      expect(boxes).toHaveLength(2);
      expect(boxes[0].props.plaintextOutput).toBe('abc');
      expect(boxes[0].props.name).toBe('Caesar Cipher (shift -1) Encode');

      expect(boxes[1].props.plaintextOutput).toBe('cde');
      expect(boxes[1].props.name).toBe('Caesar Cipher (shift 1) Decode');
    });

    it('defaults to shift 13 when caesar value is true (no value given)', async () => {
      const boxes = await CaesarCipherBoxSource.generateBoxes('Hello, World!', {
        caesar: true,
      });
      expect(boxes).toHaveLength(2);
      expect(boxes[0].props.plaintextOutput).toBe('Uryyb, Jbeyq!');
      expect(boxes[0].props.name).toBe('Caesar Cipher (shift 13) Encode');
    });

    it('defaults to shift 13 on non-numeric caesar value', async () => {
      const boxes = await CaesarCipherBoxSource.generateBoxes('abc', {
        caesar: 'xyz',
      });
      expect(boxes).toHaveLength(2);
      expect(boxes[0].props.name).toBe('Caesar Cipher (shift 13) Encode');
    });

    it('preserves non-letter characters', async () => {
      const boxes = await CaesarCipherBoxSource.generateBoxes(
        'Hello, World! 123',
        { rot13: true },
      );
      expect(boxes[0].props.plaintextOutput).toBe('Uryyb, Jbeyq! 123');
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(CaesarCipherBoxSource.name).toBe('Caesar Cipher');
      expect(CaesarCipherBoxSource.tag).toBe('Aa');
      expect(CaesarCipherBoxSource.kind).toBe('Encode');
      expect(typeof CaesarCipherBoxSource.priority).toBe('number');
    });
  });
});
