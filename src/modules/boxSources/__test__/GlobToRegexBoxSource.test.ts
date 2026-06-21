import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { GlobToRegexBoxSource } from '../GlobToRegexBoxSource';

describe('GlobToRegexBoxSource', () => {
  describe('generateBoxes - no matching option', () => {
    it('returns [] when no glob option is present', async () => {
      const boxes = await GlobToRegexBoxSource.generateBoxes('*.ts', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when an unrelated option is present', async () => {
      const boxes = await GlobToRegexBoxSource.generateBoxes('*.ts', {
        sha256: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - single wildcard *', () => {
    it('converts *.ts to ^[^/]*\\.ts$', async () => {
      const boxes = await GlobToRegexBoxSource.generateBoxes('*.ts', {
        glob2regex: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('^[^/]*\\.ts$');
    });
  });

  describe('generateBoxes - double wildcard **', () => {
    it('converts src/**/*.ts to ^src/(?:.*/)?[^/]*\\.ts$', async () => {
      const boxes = await GlobToRegexBoxSource.generateBoxes('src/**/*.ts', {
        glob2regex: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('^src/(?:.*/)?[^/]*\\.ts$');
      // **/ matches zero directory segments too
      expect(new RegExp(boxes[0].props.plaintextOutput).test('src/x.ts')).toBe(
        true,
      );
    });
  });

  describe('generateBoxes - single char wildcard ?', () => {
    it('converts ? to ^[^/]$', async () => {
      const boxes = await GlobToRegexBoxSource.generateBoxes('?', {
        glob2regex: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('^[^/]$');
    });
  });

  describe('generateBoxes - character class', () => {
    it('preserves [0-9] and escapes dot in file[0-9].txt', async () => {
      const boxes = await GlobToRegexBoxSource.generateBoxes('file[0-9].txt', {
        glob2regex: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('^file[0-9]\\.txt$');
    });
  });

  describe('generateBoxes - negated character class', () => {
    it('converts [!a] to [^a] in [!a].txt', async () => {
      const boxes = await GlobToRegexBoxSource.generateBoxes('[!a].txt', {
        glob2regex: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('^[^a]\\.txt$');
    });
  });

  describe('generateBoxes - literal regex-special chars', () => {
    it('escapes + and . in a+b.c', async () => {
      const boxes = await GlobToRegexBoxSource.generateBoxes('a+b.c', {
        glob2regex: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('^a\\+b\\.c$');
    });
  });

  describe('generateBoxes - alternate option key', () => {
    it('triggers on ::globregex option key as well', async () => {
      const boxes = await GlobToRegexBoxSource.generateBoxes('*.js', {
        globregex: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('^[^/]*\\.js$');
    });
  });

  describe('generateBoxes - box metadata', () => {
    it('uses DefaultBoxTemplate and correct name', async () => {
      const boxes = await GlobToRegexBoxSource.generateBoxes('*.ts', {
        glob2regex: true,
      });
      expect(boxes[0].props.name).toBe('Glob to Regex');
      expect(boxes[0].boxTemplate).toBe(DefaultBoxTemplate);
      expect(boxes[0].props.showExpandButton).toBe(false);
    });
  });
});
