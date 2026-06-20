import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { PasswordBoxSource } from '../PasswordBoxSource';

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{}|;:,.<>?';

describe('PasswordBoxSource', () => {
  describe('generateBoxes — trigger conditions', () => {
    it('should not trigger without a password option', async () => {
      const boxes = await PasswordBoxSource.generateBoxes('anything', null);
      expect(boxes).toHaveLength(0);
    });

    it('should not trigger with unrelated options', async () => {
      const boxes = await PasswordBoxSource.generateBoxes('anything', {
        qr: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('should trigger with ::password option', async () => {
      const boxes = await PasswordBoxSource.generateBoxes('', {
        password: true,
      });
      expect(boxes).toHaveLength(3);
    });

    it('should trigger with ::pwd alias', async () => {
      const boxes = await PasswordBoxSource.generateBoxes('', { pwd: true });
      expect(boxes).toHaveLength(3);
    });

    it('should trigger with ::pass alias', async () => {
      const boxes = await PasswordBoxSource.generateBoxes('', { pass: true });
      expect(boxes).toHaveLength(3);
    });
  });

  describe('generateBoxes — defaults', () => {
    it('should produce 3 password boxes with default length 16', async () => {
      const boxes = await PasswordBoxSource.generateBoxes('', {
        password: true,
      });
      expect(boxes).toHaveLength(3);
      for (const box of boxes) {
        expect(box.props.plaintextOutput).toHaveLength(16);
        expect(box.props.name).toBe('Password Generator');
        expect(box.boxTemplate).toBe(DefaultBoxTemplate);
      }
    });
  });

  describe('generateBoxes — length control', () => {
    it('should use length from ::password=N value', async () => {
      const boxes = await PasswordBoxSource.generateBoxes('', {
        password: '24',
      });
      expect(boxes).toHaveLength(3);
      for (const box of boxes) {
        expect(box.props.plaintextOutput).toHaveLength(24);
      }
    });

    it('should use length from ::pwd=N value', async () => {
      const boxes = await PasswordBoxSource.generateBoxes('', { pwd: '20' });
      expect(boxes).toHaveLength(3);
      for (const box of boxes) {
        expect(box.props.plaintextOutput).toHaveLength(20);
      }
    });

    it('should use length from ::len=N option', async () => {
      const boxes = await PasswordBoxSource.generateBoxes('', {
        password: true,
        len: '20',
      });
      // ::password=true (boolean) so len fallback is used
      expect(boxes).toHaveLength(3);
      for (const box of boxes) {
        expect(box.props.plaintextOutput).toHaveLength(20);
      }
    });

    it('should clamp length to minimum 4', async () => {
      const boxes = await PasswordBoxSource.generateBoxes('', {
        password: '1',
      });
      expect(boxes).toHaveLength(3);
      for (const box of boxes) {
        expect(box.props.plaintextOutput).toHaveLength(4);
      }
    });

    it('should clamp length to maximum 256', async () => {
      const boxes = await PasswordBoxSource.generateBoxes('', {
        password: '999',
      });
      expect(boxes).toHaveLength(3);
      for (const box of boxes) {
        expect(box.props.plaintextOutput).toHaveLength(256);
      }
    });
  });

  describe('generateBoxes — character class toggles', () => {
    it('should exclude symbols when ::nosymbols is set', async () => {
      const boxes = await PasswordBoxSource.generateBoxes('', {
        password: true,
        nosymbols: true,
      });
      expect(boxes).toHaveLength(3);
      for (const box of boxes) {
        for (const ch of box.props.plaintextOutput) {
          expect(SYMBOLS).not.toContain(ch);
        }
      }
    });

    it('should exclude numbers when ::nonumbers is set', async () => {
      const boxes = await PasswordBoxSource.generateBoxes('', {
        password: true,
        nonumbers: true,
      });
      expect(boxes).toHaveLength(3);
      for (const box of boxes) {
        for (const ch of box.props.plaintextOutput) {
          expect(NUMBERS).not.toContain(ch);
        }
      }
    });

    it('should exclude lowercase when ::nolower is set', async () => {
      const boxes = await PasswordBoxSource.generateBoxes('', {
        password: true,
        nolower: true,
      });
      expect(boxes).toHaveLength(3);
      for (const box of boxes) {
        for (const ch of box.props.plaintextOutput) {
          expect(LOWERCASE).not.toContain(ch);
        }
      }
    });

    it('should exclude uppercase when ::noupper is set', async () => {
      const boxes = await PasswordBoxSource.generateBoxes('', {
        password: true,
        noupper: true,
      });
      expect(boxes).toHaveLength(3);
      for (const box of boxes) {
        for (const ch of box.props.plaintextOutput) {
          expect(UPPERCASE).not.toContain(ch);
        }
      }
    });

    it('should include at least one char from each enabled class', async () => {
      // run several times to make it statistically reliable
      for (let i = 0; i < 5; i++) {
        const boxes = await PasswordBoxSource.generateBoxes('', {
          password: true,
        });
        for (const box of boxes) {
          const pw = box.props.plaintextOutput;
          expect([...pw].some((c) => UPPERCASE.includes(c))).toBe(true);
          expect([...pw].some((c) => LOWERCASE.includes(c))).toBe(true);
          expect([...pw].some((c) => NUMBERS.includes(c))).toBe(true);
          expect([...pw].some((c) => SYMBOLS.includes(c))).toBe(true);
        }
      }
    });

    it('should include at least one number when only numbers enabled', async () => {
      const boxes = await PasswordBoxSource.generateBoxes('', {
        password: true,
        nosymbols: true,
        nolower: true,
        noupper: true,
      });
      expect(boxes).toHaveLength(3);
      for (const box of boxes) {
        const pw = box.props.plaintextOutput;
        expect([...pw].every((c) => NUMBERS.includes(c))).toBe(true);
      }
    });
  });

  describe('generateBoxes — error cases', () => {
    it('should return error box when all classes are excluded', async () => {
      const boxes = await PasswordBoxSource.generateBoxes('', {
        password: true,
        nosymbols: true,
        nonumbers: true,
        nolower: true,
        noupper: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/error/i);
    });

    it('should return error box when crypto is unavailable', async () => {
      const original = globalThis.crypto;
      // @ts-expect-error — intentionally removing crypto to test the fallback
      delete globalThis.crypto;

      try {
        const boxes = await PasswordBoxSource.generateBoxes('', {
          password: true,
        });
        expect(boxes).toHaveLength(1);
        expect(boxes[0].props.plaintextOutput).toMatch(/secure context/i);
      } finally {
        globalThis.crypto = original;
      }
    });
  });

  describe('metadata', () => {
    it('should have correct static properties', () => {
      expect(PasswordBoxSource.name).toBe('Password Generator');
      expect(PasswordBoxSource.tag).toBe('🔑');
      expect(PasswordBoxSource.kind).toBe('Generate');
      expect(PasswordBoxSource.defaultInput).toBe('::password');
    });
  });
});
