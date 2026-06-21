import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { VigenereBoxSource } from '../VigenereBoxSource';

describe('VigenereBoxSource', () => {
  describe('no option', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await VigenereBoxSource.generateBoxes('hello', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await VigenereBoxSource.generateBoxes('hello', {});
      expect(boxes).toHaveLength(0);
    });
  });

  describe('encode — canonical ATTACKATDAWN/LEMON vector', () => {
    it('encodes ATTACKATDAWN with key LEMON to LXFOPVEFRNHR', async () => {
      const boxes = await VigenereBoxSource.generateBoxes('ATTACKATDAWN', {
        vigenere: 'LEMON',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('LXFOPVEFRNHR');
      expect(boxes[0].props.name).toBe('Vigenère (Encode)');
      expect(boxes[0].boxTemplate).toBe(DefaultBoxTemplate);
    });

    it('also accepts the vigenereencode alias', async () => {
      const boxes = await VigenereBoxSource.generateBoxes('ATTACKATDAWN', {
        vigenereencode: 'LEMON',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('LXFOPVEFRNHR');
    });
  });

  describe('encode — case and spaces preserved', () => {
    it('encodes mixed-case input, preserving spaces', async () => {
      const boxes = await VigenereBoxSource.generateBoxes('Attack at dawn', {
        vigenere: 'lemon',
      });
      expect(boxes).toHaveLength(1);
      // spaces pass through; key advances only on letters
      const encoded = boxes[0].props.plaintextOutput;
      // verify round-trip: decode must restore original
      const decoded = await VigenereBoxSource.generateBoxes(encoded, {
        vigeneredecode: 'lemon',
      });
      expect(decoded[0].props.plaintextOutput).toBe('Attack at dawn');
    });
  });

  describe('decode', () => {
    it('decodes LXFOPVEFRNHR with key LEMON to ATTACKATDAWN', async () => {
      const boxes = await VigenereBoxSource.generateBoxes('LXFOPVEFRNHR', {
        vigeneredecode: 'LEMON',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('ATTACKATDAWN');
      expect(boxes[0].props.name).toBe('Vigenère (Decode)');
    });
  });

  describe('key with no letters', () => {
    it('returns an informational box when key is digits only', async () => {
      const boxes = await VigenereBoxSource.generateBoxes('hello', {
        vigenere: '1234',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/letter/i);
    });

    it('returns an informational box when key is boolean true', async () => {
      const boxes = await VigenereBoxSource.generateBoxes('hello', {
        vigenere: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/letter/i);
    });
  });

  describe('both encode and decode options', () => {
    it('returns 2 boxes when both vigenere and vigeneredecode are set', async () => {
      const boxes = await VigenereBoxSource.generateBoxes('ATTACKATDAWN', {
        vigenere: 'LEMON',
        vigeneredecode: 'LEMON',
      });
      expect(boxes).toHaveLength(2);
      const names = boxes.map((b) => b.props.name);
      expect(names).toContain('Vigenère (Encode)');
      expect(names).toContain('Vigenère (Decode)');
    });
  });

  describe('edge cases', () => {
    it('returns empty array for empty input string', async () => {
      const boxes = await VigenereBoxSource.generateBoxes('', {
        vigenere: 'key',
      });
      expect(boxes).toHaveLength(0);
    });

    it('key with mixed letters and digits strips non-letters', async () => {
      // key '1l2e3m4o5n6' → effective key 'lemon'
      const boxes = await VigenereBoxSource.generateBoxes('ATTACKATDAWN', {
        vigenere: '1l2e3m4o5n6',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('LXFOPVEFRNHR');
    });

    it('non-letter characters pass through without consuming key position', async () => {
      // 'A B' with key 'l': A→L, space→space, B→M (key wraps: l then l)
      const boxes = await VigenereBoxSource.generateBoxes('A B', {
        vigenere: 'lm',
      });
      expect(boxes).toHaveLength(1);
      // A + l(11) = L; space passes; B + m(12) = N
      expect(boxes[0].props.plaintextOutput).toBe('L N');
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(VigenereBoxSource.name).toBe('Vigenère');
      expect(VigenereBoxSource.tag).toBe('#');
      expect(VigenereBoxSource.kind).toBe('Encode');
      expect(typeof VigenereBoxSource.priority).toBe('number');
    });
  });
});
