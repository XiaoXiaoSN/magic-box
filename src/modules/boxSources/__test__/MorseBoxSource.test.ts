import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { MorseBoxSource } from '../MorseBoxSource';

describe('MorseBoxSource', () => {
  describe('no option → empty', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await MorseBoxSource.generateBoxes('SOS', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await MorseBoxSource.generateBoxes('SOS', {});
      expect(boxes).toHaveLength(0);
    });
  });

  describe('empty input → empty', () => {
    it('returns empty array for whitespace-only input with encode option', async () => {
      const boxes = await MorseBoxSource.generateBoxes('   ', { morse: true });
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty string with decode option', async () => {
      const boxes = await MorseBoxSource.generateBoxes('', {
        morsedecode: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('encode (::morse)', () => {
    it('encodes SOS correctly', async () => {
      const boxes = await MorseBoxSource.generateBoxes('SOS', { morse: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('... --- ...');
      expect(boxes[0].props.name).toBe('Morse Code (Encode)');
      expect(boxes[0].boxTemplate).toBe(DefaultBoxTemplate);
    });

    it('encodes HELLO correctly', async () => {
      const boxes = await MorseBoxSource.generateBoxes('HELLO', {
        morse: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('.... . .-.. .-.. ---');
    });

    it('separates words with " / "', async () => {
      const boxes = await MorseBoxSource.generateBoxes('HI BYE', {
        morse: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('.... .. / -... -.-- .');
    });

    it('is case-insensitive (lowercase input)', async () => {
      const boxes = await MorseBoxSource.generateBoxes('sos', { morse: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('... --- ...');
    });

    it('also triggers on ::morseencode option', async () => {
      const boxes = await MorseBoxSource.generateBoxes('SOS', {
        morseencode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('... --- ...');
    });
  });

  describe('decode (::morsedecode)', () => {
    it('decodes SOS correctly', async () => {
      const boxes = await MorseBoxSource.generateBoxes('... --- ...', {
        morsedecode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('SOS');
      expect(boxes[0].props.name).toBe('Morse Code (Decode)');
    });

    it('decodes multi-word morse separated by " / "', async () => {
      const boxes = await MorseBoxSource.generateBoxes(
        '.... .. / -... -.-- .',
        { morsedecode: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('HI BYE');
    });
  });

  describe('round-trip', () => {
    it('encode then decode returns original text', async () => {
      const original = 'HELLO WORLD';
      const encoded = await MorseBoxSource.generateBoxes(original, {
        morse: true,
      });
      const morseText = encoded[0].props.plaintextOutput;

      const decoded = await MorseBoxSource.generateBoxes(morseText, {
        morsedecode: true,
      });
      expect(decoded[0].props.plaintextOutput).toBe(original);
    });
  });

  describe('both options → 2 boxes', () => {
    it('returns encode box then decode box when both options are set', async () => {
      const boxes = await MorseBoxSource.generateBoxes('SOS', {
        morse: true,
        morsedecode: true,
      });
      expect(boxes).toHaveLength(2);
      expect(boxes[0].props.name).toBe('Morse Code (Encode)');
      expect(boxes[1].props.name).toBe('Morse Code (Decode)');
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(MorseBoxSource.name).toBe('Morse Code');
      expect(MorseBoxSource.tag).toBe('#');
      expect(MorseBoxSource.kind).toBe('Encode');
      expect(typeof MorseBoxSource.priority).toBe('number');
    });
  });
});
