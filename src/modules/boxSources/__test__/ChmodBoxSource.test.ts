import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { ChmodBoxSource } from '../ChmodBoxSource';

describe('ChmodBoxSource', () => {
  describe('option gate', () => {
    it('returns [] with no options', async () => {
      expect(await ChmodBoxSource.generateBoxes('755', null)).toHaveLength(0);
    });

    it('returns [] with unrelated options', async () => {
      expect(
        await ChmodBoxSource.generateBoxes('755', { foo: true }),
      ).toHaveLength(0);
    });

    it('triggers on ::chmod option', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('755', { chmod: true });
      expect(boxes).toHaveLength(1);
    });

    it('triggers on ::permissions option', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('755', {
        permissions: true,
      });
      expect(boxes).toHaveLength(1);
    });
  });

  describe('octal → symbolic', () => {
    it('755 → rwxr-xr-x', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('755', { chmod: true });
      expect(boxes[0].props.options).toMatchObject({
        Octal: '755',
        Symbolic: 'rwxr-xr-x',
      });
    });

    it('644 → rw-r--r--', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('644', { chmod: true });
      expect(boxes[0].props.options).toMatchObject({
        Octal: '644',
        Symbolic: 'rw-r--r--',
      });
    });

    it('777 → rwxrwxrwx', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('777', { chmod: true });
      expect(boxes[0].props.options).toMatchObject({ Symbolic: 'rwxrwxrwx' });
    });

    it('000 → ---------', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('000', { chmod: true });
      expect(boxes[0].props.options).toMatchObject({ Symbolic: '---------' });
    });

    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('755', { chmod: true });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('sets priority to 10', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('755', { chmod: true });
      expect(boxes[0].props.priority).toBe(10);
    });

    it('includes Description with human-readable labels', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('755', { chmod: true });
      const desc = boxes[0].props.options?.Description as string;
      expect(desc).toMatch(/user/i);
      expect(desc).toMatch(/group/i);
      expect(desc).toMatch(/other/i);
    });
  });

  describe('setuid / special bits (4-digit octal)', () => {
    it('4755 → rwsr-xr-x (setuid sets user x to s)', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('4755', { chmod: true });
      expect(boxes[0].props.options).toMatchObject({
        Octal: '4755',
        Symbolic: 'rwsr-xr-x',
      });
    });

    it('2755 → rwxr-sr-x (setgid sets group x to s)', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('2755', { chmod: true });
      expect(boxes[0].props.options).toMatchObject({ Symbolic: 'rwxr-sr-x' });
    });

    it('1755 → rwxr-xr-t (sticky sets other x to t)', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('1755', { chmod: true });
      expect(boxes[0].props.options).toMatchObject({ Symbolic: 'rwxr-xr-t' });
    });

    it('4644 → rwSr--r-- (setuid, no user x → S)', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('4644', { chmod: true });
      expect(boxes[0].props.options).toMatchObject({ Symbolic: 'rwSr--r--' });
    });
  });

  describe('symbolic → octal', () => {
    it('rwxr-xr-x → 755', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('rwxr-xr-x', {
        chmod: true,
      });
      expect(boxes[0].props.options).toMatchObject({
        Octal: '755',
        Symbolic: 'rwxr-xr-x',
      });
    });

    it('rw-r--r-- → 644', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('rw-r--r--', {
        chmod: true,
      });
      expect(boxes[0].props.options).toMatchObject({ Octal: '644' });
    });

    it('rwxrwxrwx → 777', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('rwxrwxrwx', {
        chmod: true,
      });
      expect(boxes[0].props.options).toMatchObject({ Octal: '777' });
    });

    it('--------- → 000', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('---------', {
        chmod: true,
      });
      expect(boxes[0].props.options).toMatchObject({ Octal: '000' });
    });

    it('rwsr-xr-x → 4755 (setuid round-trip)', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('rwsr-xr-x', {
        chmod: true,
      });
      expect(boxes[0].props.options).toMatchObject({ Octal: '4755' });
    });

    it('rwxr-sr-x → 2755 (setgid)', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('rwxr-sr-x', {
        chmod: true,
      });
      expect(boxes[0].props.options).toMatchObject({ Octal: '2755' });
    });

    it('rwxr-xr-t → 1755 (sticky)', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('rwxr-xr-t', {
        chmod: true,
      });
      expect(boxes[0].props.options).toMatchObject({ Octal: '1755' });
    });
  });

  describe('leading file-type character', () => {
    it('drwxr-xr-x → 755 (strips leading d)', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('drwxr-xr-x', {
        chmod: true,
      });
      expect(boxes[0].props.options).toMatchObject({ Octal: '755' });
    });

    it('-rwxr-xr-x → 755 (strips leading -)', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('-rwxr-xr-x', {
        chmod: true,
      });
      expect(boxes[0].props.options).toMatchObject({ Octal: '755' });
    });
  });

  describe('invalid input', () => {
    it('abc → format hint box', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('abc', { chmod: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/octal|symbolic/i);
    });

    it('999 (invalid octal) → format hint box', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('999', { chmod: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/octal|symbolic/i);
    });

    it('empty string → format hint box', async () => {
      const boxes = await ChmodBoxSource.generateBoxes('', { chmod: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/octal|symbolic/i);
    });
  });

  describe('round-trip', () => {
    it('755 octal → symbolic → octal', async () => {
      const box1 = await ChmodBoxSource.generateBoxes('755', { chmod: true });
      const sym = box1[0].props.options?.Symbolic as string;
      const box2 = await ChmodBoxSource.generateBoxes(sym, { chmod: true });
      expect(box2[0].props.options).toMatchObject({ Octal: '755' });
    });

    it('4755 octal → symbolic → octal', async () => {
      const box1 = await ChmodBoxSource.generateBoxes('4755', { chmod: true });
      const sym = box1[0].props.options?.Symbolic as string;
      const box2 = await ChmodBoxSource.generateBoxes(sym, { chmod: true });
      expect(box2[0].props.options).toMatchObject({ Octal: '4755' });
    });
  });
});
