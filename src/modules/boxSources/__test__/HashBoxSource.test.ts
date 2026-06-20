import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { HashBoxSource } from '../HashBoxSource';

describe('HashBoxSource', () => {
  describe('generateBoxes - no option', () => {
    it('returns empty array when no hash option is provided', async () => {
      const boxes = await HashBoxSource.generateBoxes('hello', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options', async () => {
      const boxes = await HashBoxSource.generateBoxes('hello', {});
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - SHA-256 known vector', () => {
    it('produces correct SHA-256 digest for "abc"', async () => {
      // NIST FIPS 180-4 test vector
      const boxes = await HashBoxSource.generateBoxes('abc', { sha256: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe(
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      );
      expect(boxes[0].props.name).toBe('SHA-256');
      expect(boxes[0].boxTemplate).toBe(DefaultBoxTemplate);
    });

    it('produces correct SHA-256 digest for empty string', async () => {
      const boxes = await HashBoxSource.generateBoxes('', { sha256: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe(
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      );
    });
  });

  describe('generateBoxes - SHA-1 known vector', () => {
    it('produces correct SHA-1 digest for "abc"', async () => {
      const boxes = await HashBoxSource.generateBoxes('abc', { sha1: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe(
        'a9993e364706816aba3e25717850c26c9cd0d89d',
      );
      expect(boxes[0].props.name).toBe('SHA-1');
    });
  });

  describe('generateBoxes - SHA-512 known vector', () => {
    it('produces correct SHA-512 digest for "abc"', async () => {
      const boxes = await HashBoxSource.generateBoxes('abc', { sha512: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe(
        'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f',
      );
      // SHA-512 hex is 128 chars
      expect(boxes[0].props.plaintextOutput).toHaveLength(128);
      expect(boxes[0].props.name).toBe('SHA-512');
    });
  });

  describe('generateBoxes - ::hash produces all algorithms', () => {
    it('returns three boxes for ::hash option', async () => {
      const boxes = await HashBoxSource.generateBoxes('abc', { hash: true });
      expect(boxes).toHaveLength(3);

      const names = boxes.map((b) => b.props.name);
      expect(names).toContain('SHA-1');
      expect(names).toContain('SHA-256');
      expect(names).toContain('SHA-512');
    });

    it('sha256 digest inside ::hash output matches standalone result', async () => {
      const all = await HashBoxSource.generateBoxes('hello', { hash: true });
      const sha256box = all.find((b) => b.props.name === 'SHA-256');
      const standalone = await HashBoxSource.generateBoxes('hello', {
        sha256: true,
      });
      expect(sha256box?.props.plaintextOutput).toBe(
        standalone[0].props.plaintextOutput,
      );
    });
  });

  describe('generateBoxes - option routing', () => {
    it('only sha1 box is returned when sha1 option set', async () => {
      const boxes = await HashBoxSource.generateBoxes('test', { sha1: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('SHA-1');
    });

    it('only sha512 box is returned when sha512 option set', async () => {
      const boxes = await HashBoxSource.generateBoxes('test', { sha512: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('SHA-512');
    });

    it('returns sha1 and sha256 when both options are set', async () => {
      const boxes = await HashBoxSource.generateBoxes('test', {
        sha1: true,
        sha256: true,
      });
      expect(boxes).toHaveLength(2);
      const names = boxes.map((b) => b.props.name);
      expect(names).toContain('SHA-1');
      expect(names).toContain('SHA-256');
    });
  });

  describe('generateBoxes - non-secure context fallback', () => {
    const originalCrypto = globalThis.crypto;

    beforeEach(() => {
      // simulate environment without crypto.subtle
      Object.defineProperty(globalThis, 'crypto', {
        value: { subtle: undefined },
        configurable: true,
        writable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        configurable: true,
        writable: true,
      });
    });

    it('returns a single informational box when crypto.subtle is unavailable', async () => {
      const boxes = await HashBoxSource.generateBoxes('abc', { sha256: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/secure context/i);
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(HashBoxSource.name).toBe('Hash');
      expect(HashBoxSource.tag).toBe('#');
      expect(HashBoxSource.kind).toBe('Hash');
      expect(typeof HashBoxSource.priority).toBe('number');
    });
  });
});
