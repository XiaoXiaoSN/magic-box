import { CodeBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { NatoPhoneticBoxSource } from '../NatoPhoneticBoxSource';

describe('NatoPhoneticBoxSource', () => {
  describe('generateBoxes - no option', () => {
    it('returns empty array when no nato option is provided', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes('AB12', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes('AB12', {});
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - empty/whitespace input', () => {
    it('returns empty array for empty string', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes('', {
        nato: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for whitespace-only input', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes('   ', {
        nato: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - phonetic conversion', () => {
    it('converts uppercase letters and digits', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes('AB12', {
        nato: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('Alfa Bravo One Two');
    });

    it('converts lowercase letters case-insensitively', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes('abc', {
        nato: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('Alfa Bravo Charlie');
    });

    it('converts space to (space) token', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes('A B', {
        nato: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('Alfa (space) Bravo');
    });

    it('passes through non-alphanumeric characters as-is', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes('A!', {
        nato: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('Alfa !');
    });
  });

  describe('generateBoxes - box properties', () => {
    it('returns a box named NATO Phonetic using CodeBoxTemplate', async () => {
      const boxes = await NatoPhoneticBoxSource.generateBoxes('AB12', {
        nato: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('NATO Phonetic');
      expect(boxes[0].boxTemplate).toBe(CodeBoxTemplate);
      expect(boxes[0].props.priority).toBe(NatoPhoneticBoxSource.priority);
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(NatoPhoneticBoxSource.name).toBe('NATO Phonetic');
      expect(NatoPhoneticBoxSource.kind).toBe('Convert');
      expect(typeof NatoPhoneticBoxSource.priority).toBe('number');
    });
  });
});
