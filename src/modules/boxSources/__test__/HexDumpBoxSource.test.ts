import { describe, expect, it } from 'vitest';

import { HexDumpBoxSource } from '../HexDumpBoxSource';

describe('HexDumpBoxSource', () => {
  describe('generateBoxes - no option', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await HexDumpBoxSource.generateBoxes('Hello, World!', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await HexDumpBoxSource.generateBoxes('Hello, World!', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for unrelated option', async () => {
      const boxes = await HexDumpBoxSource.generateBoxes('Hello, World!', {
        base64: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - empty input', () => {
    it('returns empty array for empty string with ::hexdump', async () => {
      const boxes = await HexDumpBoxSource.generateBoxes('', { hexdump: true });
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty string with ::xxd', async () => {
      const boxes = await HexDumpBoxSource.generateBoxes('', { xxd: true });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - Hello, World! with ::hexdump', () => {
    it('produces one box', async () => {
      const boxes = await HexDumpBoxSource.generateBoxes('Hello, World!', {
        hexdump: true,
      });
      expect(boxes).toHaveLength(1);
    });

    it('output contains hex bytes for "Hello"', async () => {
      const boxes = await HexDumpBoxSource.generateBoxes('Hello, World!', {
        hexdump: true,
      });
      expect(boxes[0].props.plaintextOutput).toContain('48 65 6c 6c 6f');
    });

    it('output contains ASCII column with |Hello, World!|', async () => {
      const boxes = await HexDumpBoxSource.generateBoxes('Hello, World!', {
        hexdump: true,
      });
      expect(boxes[0].props.plaintextOutput).toContain('|Hello, World!|');
    });

    it('output starts with offset 00000000', async () => {
      const boxes = await HexDumpBoxSource.generateBoxes('Hello, World!', {
        hexdump: true,
      });
      expect(boxes[0].props.plaintextOutput).toMatch(/^00000000/);
    });

    it('box name is "Hex Dump"', async () => {
      const boxes = await HexDumpBoxSource.generateBoxes('Hello, World!', {
        hexdump: true,
      });
      expect(boxes[0].props.name).toBe('Hex Dump');
    });
  });

  describe('generateBoxes - ::xxd trigger', () => {
    it('also triggers on ::xxd option', async () => {
      const boxes = await HexDumpBoxSource.generateBoxes('Hello, World!', {
        xxd: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toContain('48 65 6c 6c 6f');
    });
  });

  describe('generateBoxes - two-row output', () => {
    it('20-char input produces exactly 2 rows', async () => {
      // exactly 20 bytes in ASCII: row 0 (bytes 0-15) + row 1 (bytes 16-19)
      const input = 'ABCDEFGHIJKLMNOPQRST'; // 20 chars
      const boxes = await HexDumpBoxSource.generateBoxes(input, {
        hexdump: true,
      });
      const rows = boxes[0].props.plaintextOutput.split('\n');
      expect(rows).toHaveLength(2);
    });

    it('second row starts with offset 00000010', async () => {
      const input = 'ABCDEFGHIJKLMNOPQRST'; // 20 chars
      const boxes = await HexDumpBoxSource.generateBoxes(input, {
        hexdump: true,
      });
      const rows = boxes[0].props.plaintextOutput.split('\n');
      expect(rows[1]).toMatch(/^00000010/);
    });
  });

  describe('generateBoxes - non-printable characters', () => {
    it('shows "." for newline (0x0a) in the ASCII column', async () => {
      const boxes = await HexDumpBoxSource.generateBoxes('A\nB', {
        hexdump: true,
      });
      // ASCII column should be |A.B|
      expect(boxes[0].props.plaintextOutput).toContain('|A.B|');
    });

    it('hex bytes include 0a for the newline', async () => {
      const boxes = await HexDumpBoxSource.generateBoxes('A\nB', {
        hexdump: true,
      });
      expect(boxes[0].props.plaintextOutput).toContain('41 0a 42');
    });
  });

  describe('generateBoxes - gap between 8th and 9th byte', () => {
    it('has two spaces between the first and second group of 8 hex bytes on a full row', async () => {
      // 16+ char input ensures a full first row
      const input = 'ABCDEFGHIJKLMNOPQRST'; // 20 chars
      const boxes = await HexDumpBoxSource.generateBoxes(input, {
        hexdump: true,
      });
      const firstRow = boxes[0].props.plaintextOutput.split('\n')[0];
      // pattern: <offset>  <8 bytes separated by spaces>  <8 bytes separated by spaces>  |ascii|
      // the gap is two spaces between the two groups
      // check that "XX  XX" pattern (two spaces) appears after the 8th byte
      const hexSection = firstRow.slice(10); // skip "00000000  "
      const [firstGroup, secondGroup] = hexSection.split('  ');
      expect(firstGroup.trim().split(' ')).toHaveLength(8);
      expect(secondGroup.trim().split(' ')[0]).toHaveLength(2); // first byte of second group
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(HexDumpBoxSource.name).toBe('Hex Dump');
      expect(HexDumpBoxSource.tag).toBe('#');
      expect(HexDumpBoxSource.kind).toBe('Analyze');
      expect(typeof HexDumpBoxSource.priority).toBe('number');
    });
  });
});
