import { CodeBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { UnaccentBoxSource } from '../UnaccentBoxSource';

describe('UnaccentBoxSource', () => {
  describe('generateBoxes - gate checks', () => {
    it('returns empty array when no trigger option is provided', async () => {
      const boxes = await UnaccentBoxSource.generateBoxes('café', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await UnaccentBoxSource.generateBoxes('café', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for unrelated option', async () => {
      const boxes = await UnaccentBoxSource.generateBoxes('café', {
        foo: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty input string', async () => {
      const boxes = await UnaccentBoxSource.generateBoxes('', {
        unaccent: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for whitespace-only input', async () => {
      const boxes = await UnaccentBoxSource.generateBoxes('   ', {
        unaccent: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - NFD diacritics', () => {
    it('strips acute accent: café → cafe', async () => {
      const boxes = await UnaccentBoxSource.generateBoxes('café', {
        unaccent: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('cafe');
    });

    it('strips multiple accents: Crème brûlée → Creme brulee', async () => {
      const boxes = await UnaccentBoxSource.generateBoxes('Crème brûlée', {
        unaccent: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('Creme brulee');
    });

    it('strips diaeresis: naïve résumé → naive resume', async () => {
      const boxes = await UnaccentBoxSource.generateBoxes('naïve résumé', {
        unaccent: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('naive resume');
    });

    it('strips tilde: piñata → pinata', async () => {
      const boxes = await UnaccentBoxSource.generateBoxes('piñata', {
        unaccent: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('pinata');
    });

    it('strips umlaut: Zürich → Zurich', async () => {
      const boxes = await UnaccentBoxSource.generateBoxes('Zürich', {
        unaccent: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('Zurich');
    });
  });

  describe('generateBoxes - special character map', () => {
    it('converts Łódź → Lodz (ł, ó, dź)', async () => {
      const boxes = await UnaccentBoxSource.generateBoxes('Łódź', {
        unaccent: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('Lodz');
    });

    it('converts ß → ss: Straße → Strasse', async () => {
      const boxes = await UnaccentBoxSource.generateBoxes('Straße', {
        unaccent: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('Strasse');
    });

    it('converts Æ → AE: Æon → AEon', async () => {
      const boxes = await UnaccentBoxSource.generateBoxes('Æon', {
        unaccent: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('AEon');
    });

    it('converts œ → oe: œuvre → oeuvre', async () => {
      const boxes = await UnaccentBoxSource.generateBoxes('œuvre', {
        unaccent: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('oeuvre');
    });

    it('converts ø → o and Ø → O', async () => {
      const boxes = await UnaccentBoxSource.generateBoxes('søster Øst', {
        unaccent: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('soster Ost');
    });

    it('converts đ → d and Đ → D', async () => {
      const boxes = await UnaccentBoxSource.generateBoxes('Đà Nẵng', {
        unaccent: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('Da Nang');
    });

    it('converts ð → d and þ → th', async () => {
      const boxes = await UnaccentBoxSource.generateBoxes('þing ðat', {
        unaccent: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('thing dat');
    });
  });

  describe('generateBoxes - non-latin pass-through', () => {
    it('leaves CJK characters unchanged: 日本語 → 日本語', async () => {
      const boxes = await UnaccentBoxSource.generateBoxes('日本語', {
        unaccent: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('日本語');
    });
  });

  describe('generateBoxes - alias options', () => {
    it('::deburr alias works', async () => {
      const boxes = await UnaccentBoxSource.generateBoxes('café', {
        deburr: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('cafe');
    });

    it('::removeaccents alias works', async () => {
      const boxes = await UnaccentBoxSource.generateBoxes('café', {
        removeaccents: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('cafe');
    });
  });

  describe('generateBoxes - box metadata', () => {
    it('sets correct box name, priority, and template', async () => {
      const boxes = await UnaccentBoxSource.generateBoxes('café', {
        unaccent: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Remove Accents');
      expect(boxes[0].props.priority).toBe(10);
      expect(boxes[0].boxTemplate).toBe(CodeBoxTemplate);
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(UnaccentBoxSource.name).toBe('Remove Accents');
      expect(UnaccentBoxSource.kind).toBe('Transform');
      expect(typeof UnaccentBoxSource.priority).toBe('number');
    });
  });
});
