import { ChmodBoxSource } from '@modules/boxSources/ChmodBoxSource';
import { describe, expect, it } from 'vitest';

describe('ChmodBoxSource', () => {
  describe('generateBoxes - no option', () => {
    it('returns [] when ::chmod option is absent', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('755', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty options object', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('755', {});
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - octal input', () => {
    it('converts 755 to rwxr-xr-x', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('755', { chmod: true });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Octal).toBe('755');
      expect(opts.Symbolic).toBe('rwxr-xr-x');
    });

    it('converts 644 to rw-r--r--', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('644', { chmod: true });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Octal).toBe('644');
      expect(opts.Symbolic).toBe('rw-r--r--');
    });

    it('converts 4755 (setuid) to rwsr-xr-x', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('4755', { chmod: true });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Octal).toBe('4755');
      expect(opts.Symbolic).toBe('rwsr-xr-x');
    });

    it('converts 1777 (sticky) to rwxrwxrwt', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('1777', { chmod: true });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Octal).toBe('1777');
      expect(opts.Symbolic).toBe('rwxrwxrwt');
    });
  });

  describe('generateBoxes - symbolic input', () => {
    it('converts rwxr-xr-x to 755', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('rwxr-xr-x', {
        chmod: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Octal).toBe('755');
      expect(opts.Symbolic).toBe('rwxr-xr-x');
    });

    it('converts rwsr-xr-x back to 4755', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('rwsr-xr-x', {
        chmod: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Octal).toBe('4755');
      expect(opts.Symbolic).toBe('rwsr-xr-x');
    });
  });

  describe('generateBoxes - invalid input', () => {
    it('returns [] for 999 (invalid octal digit)', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('999', { chmod: true });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for 888 (invalid octal digit)', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('888', { chmod: true });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for arbitrary text', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('hello', {
        chmod: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - output shape', () => {
    it('plaintextOutput contains both Octal and Symbolic lines', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('755', { chmod: true });
      const text = boxes[0].props.plaintextOutput;
      expect(text).toContain('Octal: 755');
      expect(text).toContain('Symbolic: rwxr-xr-x');
    });

    it('box name is Chmod', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('755', { chmod: true });
      expect(boxes[0].props.name).toBe('Chmod');
    });
  });

  describe('symbolic structural validation', () => {
    it('rejects character-allowlist garbage that is not a valid permission string', async () => {
      for (const bad of ['xxxxxxxxx', 'sssssssss', 'rr-r--r--']) {
        const boxes = await ChmodBoxSource.generateBoxes(bad, { chmod: true });
        expect(boxes).toHaveLength(0);
      }
    });

    it('converts setgid-only octal input', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('2755', { chmod: true });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Symbolic).toBe('rwxr-sr-x');
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(ChmodBoxSource.name).toBe('Chmod');
      expect(ChmodBoxSource.kind).toBe('Convert');
      expect(ChmodBoxSource.defaultInput).toBe('755 ::chmod');
      expect(typeof ChmodBoxSource.priority).toBe('number');
    });
  });
});
