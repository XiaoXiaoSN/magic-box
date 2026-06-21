import { describe, expect, it } from 'vitest';

import { PolybiusBoxSource } from '../PolybiusBoxSource';

describe('PolybiusBoxSource', () => {
  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(PolybiusBoxSource.name).toBe('Polybius Square');
      expect(PolybiusBoxSource.tag).toBe('#');
      expect(PolybiusBoxSource.kind).toBe('Encode');
      expect(typeof PolybiusBoxSource.priority).toBe('number');
    });
  });

  describe('generateBoxes — option gating', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await PolybiusBoxSource.generateBoxes('HELLO', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty options object', async () => {
      const boxes = await PolybiusBoxSource.generateBoxes('HELLO', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input with ::polybius', async () => {
      const boxes = await PolybiusBoxSource.generateBoxes('', {
        polybius: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for whitespace-only input', async () => {
      const boxes = await PolybiusBoxSource.generateBoxes('   ', {
        polybius: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes — encode', () => {
    it('encodes HELLO correctly via ::polybius', async () => {
      // H=idx7→23, E=idx4→15, L=idx10→31, L→31, O=idx13→35
      const boxes = await PolybiusBoxSource.generateBoxes('HELLO', {
        polybius: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Polybius Square (Encode)');
      expect(boxes[0].props.plaintextOutput).toBe('23 15 31 31 34');
    });

    it('encodes HELLO correctly via ::polybiusencode', async () => {
      const boxes = await PolybiusBoxSource.generateBoxes('HELLO', {
        polybiusencode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('23 15 31 31 34');
    });

    it('maps J to I before encoding (JUMP)', async () => {
      // J→I=idx8→24, U=idx19→45, M=idx11→32, P=idx14→35
      const boxes = await PolybiusBoxSource.generateBoxes('JUMP', {
        polybius: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('24 45 32 35');
    });

    it('handles lowercase input by uppercasing', async () => {
      const boxes = await PolybiusBoxSource.generateBoxes('hello', {
        polybius: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('23 15 31 31 34');
    });

    it('drops non-letter characters', async () => {
      // only letters are encoded; spaces and punctuation are dropped
      const boxes = await PolybiusBoxSource.generateBoxes('HI!', {
        polybius: true,
      });
      expect(boxes).toHaveLength(1);
      // H=23, I=24
      expect(boxes[0].props.plaintextOutput).toBe('23 24');
    });
  });

  describe('generateBoxes — decode', () => {
    it('decodes "23 15 31 31 34" back to HELLO', async () => {
      const boxes = await PolybiusBoxSource.generateBoxes('23 15 31 31 34', {
        polybiusdecode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Polybius Square (Decode)');
      expect(boxes[0].props.plaintextOutput).toBe('HELLO');
    });

    it('returns ? for invalid pairs', async () => {
      const boxes = await PolybiusBoxSource.generateBoxes('99 00', {
        polybiusdecode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('??');
    });
  });

  describe('generateBoxes — round-trip', () => {
    it('round-trips POLYBIUS through encode then decode', async () => {
      const [encBox] = await PolybiusBoxSource.generateBoxes('POLYBIUS', {
        polybius: true,
      });
      const encoded = encBox.props.plaintextOutput;

      const [decBox] = await PolybiusBoxSource.generateBoxes(encoded, {
        polybiusdecode: true,
      });
      // note: B→I path: no J in POLYBIUS, so round-trip is lossless
      expect(decBox.props.plaintextOutput).toBe('POLYBIUS');
    });
  });

  describe('generateBoxes — both options produce two boxes', () => {
    it('returns 2 boxes when both ::polybius and ::polybiusdecode are set', async () => {
      // input is valid for encode; decode of "HELLO" treats each char as a token → '?????'
      const boxes = await PolybiusBoxSource.generateBoxes('HELLO', {
        polybius: true,
        polybiusdecode: true,
      });
      expect(boxes).toHaveLength(2);
      expect(boxes[0].props.name).toBe('Polybius Square (Encode)');
      expect(boxes[1].props.name).toBe('Polybius Square (Decode)');
    });
  });

  describe('generateBoxes — showExpandButton', () => {
    it('sets showExpandButton to false on encode box', async () => {
      const boxes = await PolybiusBoxSource.generateBoxes('HELLO', {
        polybius: true,
      });
      expect(boxes[0].props.showExpandButton).toBe(false);
    });

    it('sets showExpandButton to false on decode box', async () => {
      const boxes = await PolybiusBoxSource.generateBoxes('23 15 31 31 34', {
        polybiusdecode: true,
      });
      expect(boxes[0].props.showExpandButton).toBe(false);
    });
  });
});
