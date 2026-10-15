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
      expect(boxes[0].view).toBe('default');
      expect(boxes[0].props.showExpandButton).toBe(false);
    });
  });

  it('treats escaped wildcards as literal characters', async () => {
    const boxes = await GlobToRegexBoxSource.generateBoxes('foo\\*.txt', {
      glob2regex: true,
    });
    expect(boxes[0].props.plaintextOutput).toBe(String.raw`^foo\*\.txt$`);
    const regex = new RegExp(boxes[0].props.plaintextOutput as string);
    expect(regex.test('foo*.txt')).toBe(true);
    expect(regex.test('foox.txt')).toBe(false);
  });

  it('treats an unterminated bracket as a literal', async () => {
    const boxes = await GlobToRegexBoxSource.generateBoxes('a[bc', {
      glob2regex: true,
    });
    expect(boxes[0].props.plaintextOutput).toBe(String.raw`^a\[bc$`);
    expect(
      new RegExp(boxes[0].props.plaintextOutput as string).test('a[bc'),
    ).toBe(true);
  });

  it('compiles a class containing a literal closing bracket', async () => {
    const boxes = await GlobToRegexBoxSource.generateBoxes('[]a]', {
      glob2regex: true,
    });
    const regex = new RegExp(boxes[0].props.plaintextOutput as string);
    expect(regex.test(']')).toBe(true);
    expect(regex.test('a')).toBe(true);
    expect(regex.test('b')).toBe(false);
  });

  it('returns no box for an empty directive pattern', async () => {
    const boxes = await GlobToRegexBoxSource.generateBoxes('', {
      glob2regex: true,
    });
    expect(boxes).toHaveLength(0);
  });

  it('supports an escaped closing bracket inside a character class', async () => {
    const boxes = await GlobToRegexBoxSource.generateBoxes(String.raw`[\]]`, {
      glob2regex: true,
    });
    const regex = new RegExp(boxes[0].props.plaintextOutput as string);
    expect(regex.test(']')).toBe(true);
    expect(regex.test('a')).toBe(false);
  });

  it('handles a maximum-length run of unmatched opening brackets', async () => {
    const boxes = await GlobToRegexBoxSource.generateBoxes('['.repeat(10_000), {
      glob2regex: true,
    });
    expect(boxes[0].props.plaintextOutput).toHaveLength(20_002);
  });
});
