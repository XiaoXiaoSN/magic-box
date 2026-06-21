import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { UuidV5BoxSource } from '../UuidV5BoxSource';

describe('UuidV5BoxSource', () => {
  describe('generateBoxes - no option', () => {
    it('returns empty array when no uuidv5 option is provided', async () => {
      const boxes = await UuidV5BoxSource.generateBoxes('example.com', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await UuidV5BoxSource.generateBoxes('example.com', {});
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - RFC 4122 canonical vectors', () => {
    // canonical uuidv5(DNS, 'example.com') = cfbff0d1-9375-5685-968c-48ce8b15ae17
    it('produces correct UUID v5 for dns namespace and "example.com"', async () => {
      const boxes = await UuidV5BoxSource.generateBoxes('example.com', {
        uuidv5: 'dns',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.UUID).toBe(
        'cfbff0d1-9375-5685-968c-48ce8b15ae17',
      );
    });

    // canonical uuidv5(DNS, 'www.example.com') = 2ed6657d-e927-568b-95e1-2665a8aea6a2
    it('produces correct UUID v5 for dns namespace and "www.example.com"', async () => {
      const boxes = await UuidV5BoxSource.generateBoxes('www.example.com', {
        uuidv5: 'dns',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.UUID).toBe(
        '2ed6657d-e927-568b-95e1-2665a8aea6a2',
      );
    });

    it('produces the same result when supplying the DNS namespace UUID explicitly', async () => {
      const boxes = await UuidV5BoxSource.generateBoxes('example.com', {
        uuidv5: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.UUID).toBe(
        'cfbff0d1-9375-5685-968c-48ce8b15ae17',
      );
    });
  });

  describe('generateBoxes - namespace aliases (case-insensitive)', () => {
    it('accepts uppercase DNS alias', async () => {
      const boxes = await UuidV5BoxSource.generateBoxes('example.com', {
        uuidv5: 'DNS',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.UUID).toBe(
        'cfbff0d1-9375-5685-968c-48ce8b15ae17',
      );
    });

    it('resolves url namespace alias correctly', async () => {
      const boxes = await UuidV5BoxSource.generateBoxes('example.com', {
        uuidv5: 'url',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Namespace).toBe(
        '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
      );
    });
  });

  describe('generateBoxes - box metadata', () => {
    it('sets the box name to "UUID v5"', async () => {
      const boxes = await UuidV5BoxSource.generateBoxes('example.com', {
        uuidv5: 'dns',
      });
      expect(boxes[0].props.name).toBe('UUID v5');
    });

    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await UuidV5BoxSource.generateBoxes('example.com', {
        uuidv5: 'dns',
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('sets options with UUID, Namespace, and Name keys', async () => {
      const boxes = await UuidV5BoxSource.generateBoxes('example.com', {
        uuidv5: 'dns',
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.UUID).toBeDefined();
      expect(opts.Namespace).toBe('6ba7b810-9dad-11d1-80b4-00c04fd430c8');
      expect(opts.Name).toBe('example.com');
    });

    it('emits plaintextOutput as k: v lines', async () => {
      const boxes = await UuidV5BoxSource.generateBoxes('example.com', {
        uuidv5: 'dns',
      });
      const out = boxes[0].props.plaintextOutput;
      expect(out).toContain('UUID: cfbff0d1-9375-5685-968c-48ce8b15ae17');
      expect(out).toContain('Namespace: 6ba7b810-9dad-11d1-80b4-00c04fd430c8');
      expect(out).toContain('Name: example.com');
    });

    it('sets priority from source priority', async () => {
      const boxes = await UuidV5BoxSource.generateBoxes('example.com', {
        uuidv5: 'dns',
      });
      expect(boxes[0].props.priority).toBe(UuidV5BoxSource.priority);
    });
  });

  describe('generateBoxes - version and variant bits', () => {
    it('has version nibble 5 in the UUID', async () => {
      const boxes = await UuidV5BoxSource.generateBoxes('example.com', {
        uuidv5: 'dns',
      });
      const uuid = boxes[0].props.options?.UUID as string;
      // 3rd group, first char is the version nibble
      expect(uuid.split('-')[2][0]).toBe('5');
    });

    it('has RFC 4122 variant bits (8, 9, a, or b) in byte 8', async () => {
      const boxes = await UuidV5BoxSource.generateBoxes('example.com', {
        uuidv5: 'dns',
      });
      const uuid = boxes[0].props.options?.UUID as string;
      // 4th group, first char encodes the variant nibble
      const variantChar = uuid.split('-')[3][0];
      expect(['8', '9', 'a', 'b']).toContain(variantChar);
    });
  });

  describe('generateBoxes - bare ::uuidv5 (namespace required)', () => {
    it('returns a box explaining namespace is required when value is true', async () => {
      const boxes = await UuidV5BoxSource.generateBoxes('example.com', {
        uuidv5: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/namespace/i);
    });

    it('returns an explanatory box for an invalid namespace string', async () => {
      const boxes = await UuidV5BoxSource.generateBoxes('example.com', {
        uuidv5: 'notanamespace',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/namespace/i);
    });
  });

  describe('generateBoxes - non-secure context fallback', () => {
    const originalCrypto = globalThis.crypto;

    beforeEach(() => {
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
      const boxes = await UuidV5BoxSource.generateBoxes('example.com', {
        uuidv5: 'dns',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/secure context/i);
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(UuidV5BoxSource.name).toBe('UUID v5');
      expect(UuidV5BoxSource.tag).toBe('#');
      expect(UuidV5BoxSource.kind).toBe('Generate');
      expect(typeof UuidV5BoxSource.priority).toBe('number');
    });
  });
});
