import { describe, expect, it } from 'vitest';

import { NatoPhoneticBoxSource } from '../NatoPhoneticBoxSource';

describe('NatoPhoneticBoxSource', () => {
  describe('generateBoxes — no match cases', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes('ABC');
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input with ::nato', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes('', {
        nato: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for whitespace-only input with ::nato', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes('   ', {
        nato: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when input exceeds MAX_INPUT', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes(
        'A'.repeat(10_001),
        { nato: true },
      );
      expect(boxes).toHaveLength(0);
    });
  });

  describe('encode — ::nato', () => {
    it('encodes ABC to Alfa Bravo Charlie', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes('ABC', {
        nato: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('NATO Phonetic (Encode)');
      expect(boxes[0].props.plaintextOutput).toBe('Alfa Bravo Charlie');
    });

    it('encodes SOS to Sierra Oscar Sierra', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes('SOS', {
        nato: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('Sierra Oscar Sierra');
    });

    it('encodes digit string A1 to Alfa One', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes('A1', {
        nato: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('Alfa One');
    });

    it('encodes lowercase abc same as uppercase', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes('abc', {
        nato: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('Alfa Bravo Charlie');
    });

    it('encodes via ::natoencode alias', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes('SOS', {
        natoencode: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('Sierra Oscar Sierra');
    });

    it('encodes via ::phonetic alias', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes('SOS', {
        phonetic: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('Sierra Oscar Sierra');
    });

    it('sets priority and showExpandButton correctly', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes('A', {
        nato: true,
      });
      expect(boxes[0].props.priority).toBe(10);
      expect(boxes[0].props.showExpandButton).toBe(false);
    });
  });

  describe('decode — ::natodecode', () => {
    it('decodes Alfa Bravo Charlie to ABC', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes(
        'Alfa Bravo Charlie',
        {
          natodecode: true,
        },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('NATO Phonetic (Decode)');
      expect(boxes[0].props.plaintextOutput).toBe('ABC');
    });

    it('decodes case-insensitively (alfa bravo → AB)', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes('alfa bravo', {
        natodecode: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('AB');
    });

    it('keeps unrecognized tokens as-is', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes(
        'Alfa UNKNOWN Charlie',
        {
          natodecode: true,
        },
      );
      expect(boxes[0].props.plaintextOutput).toBe('AUNKNOWNC');
    });
  });

  describe('round-trip', () => {
    it('HELLO round-trips through encode then decode', async () => {
      const encoded = await NatoPhoneticBoxSource.generateBoxes('HELLO', {
        nato: true,
      });
      const encodedText = encoded[0].props.plaintextOutput;

      const decoded = await NatoPhoneticBoxSource.generateBoxes(encodedText, {
        natodecode: true,
      });
      expect(decoded[0].props.plaintextOutput).toBe('HELLO');
    });
  });

  describe('both options — returns 2 boxes', () => {
    it('produces encode box and decode box when both options present', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes('Alfa', {
        nato: true,
        natodecode: true,
      });
      expect(boxes).toHaveLength(2);
      expect(boxes[0].props.name).toBe('NATO Phonetic (Encode)');
      expect(boxes[1].props.name).toBe('NATO Phonetic (Decode)');
    });
  });
});
