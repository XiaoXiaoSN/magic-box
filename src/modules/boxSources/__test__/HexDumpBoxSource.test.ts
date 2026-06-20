import { CodeBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { HexDumpBoxSource } from '../HexDumpBoxSource';

describe('HexDumpBoxSource', () => {
  describe('generateBoxes - no option', () => {
    it('returns empty array when options is null', async () => {
      const boxes = await HexDumpBoxSource.generateBoxes('Hello', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array when no hexdump/xxd option is provided', async () => {
      const boxes = await HexDumpBoxSource.generateBoxes('Hello', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for an unrelated option', async () => {
      const boxes = await HexDumpBoxSource.generateBoxes('Hello', {
        base64: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - empty input', () => {
    it('returns empty array for empty string with hexdump option', async () => {
      const boxes = await HexDumpBoxSource.generateBoxes('', {
        hexdump: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - ::hexdump trigger', () => {
    it('produces one box named "Hex Dump" using CodeBoxTemplate', async () => {
      const boxes = await HexDumpBoxSource.generateBoxes('Hello, World!', {
        hexdump: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Hex Dump');
      expect(boxes[0].boxTemplate).toBe(CodeBoxTemplate);
    });

    it('first line starts with "00000000" and contains the correct hex for "Hello"', async () => {
      const boxes = await HexDumpBoxSource.generateBoxes('Hello, World!', {
        hexdump: true,
      });
      const firstLine = boxes[0].props.plaintextOutput.split('\n')[0];
      expect(firstLine).toMatch(/^00000000/);
      // H=0x48 e=0x65 l=0x6c l=0x6c o=0x6f
      expect(firstLine).toContain('48 65 6c 6c 6f');
    });

    it('first line ends with the ASCII sidebar "|Hello, World!|"', async () => {
      const boxes = await HexDumpBoxSource.generateBoxes('Hello, World!', {
        hexdump: true,
      });
      const firstLine = boxes[0].props.plaintextOutput.split('\n')[0];
      expect(firstLine.endsWith('|Hello, World!|')).toBe(true);
    });
  });

  describe('generateBoxes - ::xxd trigger', () => {
    it('also activates with ::xxd option', async () => {
      const boxes = await HexDumpBoxSource.generateBoxes('Hello, World!', {
        xxd: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Hex Dump');
    });
  });

  describe('generateBoxes - multi-line output', () => {
    it('a string longer than 16 bytes produces 2+ data lines', async () => {
      // 17 bytes → 2 data lines + 1 trailing offset line = 3 lines total
      const input = 'ABCDEFGHIJKLMNOPQ'; // 17 chars, all ASCII = 17 bytes
      const boxes = await HexDumpBoxSource.generateBoxes(input, {
        hexdump: true,
      });
      const lines = boxes[0].props.plaintextOutput.split('\n');
      // at least 2 data lines
      expect(lines.length).toBeGreaterThanOrEqual(2);
    });

    it('second data line has offset "00000010"', async () => {
      const input = 'ABCDEFGHIJKLMNOPQ'; // 17 bytes
      const boxes = await HexDumpBoxSource.generateBoxes(input, {
        hexdump: true,
      });
      const lines = boxes[0].props.plaintextOutput.split('\n');
      expect(lines[1]).toMatch(/^00000010/);
    });
  });

  describe('generateBoxes - non-printable bytes', () => {
    it('renders a newline character as "." in the ASCII column', async () => {
      // "A\nB" → bytes 0x41 0x0a 0x42; ASCII sidebar should be "A.B"
      const boxes = await HexDumpBoxSource.generateBoxes('A\nB', {
        hexdump: true,
      });
      const firstLine = boxes[0].props.plaintextOutput.split('\n')[0];
      expect(firstLine).toContain('|A.B|');
    });

    it('renders a null byte as "." in the ASCII column', async () => {
      const input = 'X\x00Y';
      const boxes = await HexDumpBoxSource.generateBoxes(input, {
        hexdump: true,
      });
      const firstLine = boxes[0].props.plaintextOutput.split('\n')[0];
      expect(firstLine).toContain('|X.Y|');
    });
  });

  describe('generateBoxes - priority', () => {
    it('box priority matches HexDumpBoxSource.priority', async () => {
      const boxes = await HexDumpBoxSource.generateBoxes('test', {
        hexdump: true,
      });
      expect(boxes[0].props.priority).toBe(HexDumpBoxSource.priority);
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
