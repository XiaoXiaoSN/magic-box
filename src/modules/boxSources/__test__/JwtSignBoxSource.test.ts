import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { JwtSignBoxSource } from '../JwtSignBoxSource';

// canonical jwt.io HS256 example token
const CANONICAL_PAYLOAD =
  '{"sub":"1234567890","name":"John Doe","iat":1516239022}';
const CANONICAL_SECRET = 'your-256-bit-secret';
const CANONICAL_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

describe('JwtSignBoxSource', () => {
  describe('generateBoxes - no option', () => {
    it('returns empty array when no jwtsign option is provided', async () => {
      const boxes = await JwtSignBoxSource.generateBoxes(
        CANONICAL_PAYLOAD,
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await JwtSignBoxSource.generateBoxes(CANONICAL_PAYLOAD, {});
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - canonical jwt.io token', () => {
    it('produces the exact canonical HS256 token', async () => {
      const boxes = await JwtSignBoxSource.generateBoxes(CANONICAL_PAYLOAD, {
        jwtsign: CANONICAL_SECRET,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe(CANONICAL_TOKEN);
      expect(boxes[0].props.name).toBe('JWT Sign');
      expect(boxes[0].boxTemplate).toBe(DefaultBoxTemplate);
    });

    it('header segment is eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', async () => {
      const boxes = await JwtSignBoxSource.generateBoxes(CANONICAL_PAYLOAD, {
        jwtsign: CANONICAL_SECRET,
      });
      const [header] = boxes[0].props.plaintextOutput.split('.');
      expect(header).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });

    it('signature segment is SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c', async () => {
      const boxes = await JwtSignBoxSource.generateBoxes(CANONICAL_PAYLOAD, {
        jwtsign: CANONICAL_SECRET,
      });
      const parts = boxes[0].props.plaintextOutput.split('.');
      expect(parts[2]).toBe('SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');
    });
  });

  describe('generateBoxes - missing secret', () => {
    it('returns a box mentioning secret required when ::jwtsign has no value (boolean true)', async () => {
      const boxes = await JwtSignBoxSource.generateBoxes('{"a":1}', {
        jwtsign: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/secret/i);
    });
  });

  describe('generateBoxes - invalid JSON payload', () => {
    it('returns a box mentioning invalid JSON when payload is not parseable', async () => {
      const boxes = await JwtSignBoxSource.generateBoxes('not-json', {
        jwtsign: 'x',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/invalid/i);
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

    it('returns a box mentioning secure context when crypto.subtle is unavailable', async () => {
      const boxes = await JwtSignBoxSource.generateBoxes('{"a":1}', {
        jwtsign: 'secret',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/secure context/i);
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(JwtSignBoxSource.name).toBe('JWT Sign');
      expect(JwtSignBoxSource.tag).toBe('#');
      expect(JwtSignBoxSource.kind).toBe('Encode');
      expect(typeof JwtSignBoxSource.priority).toBe('number');
    });

    it('rejects a non-object JSON payload (array / primitive)', async () => {
      for (const payload of ['[1,2,3]', '123', '"hi"', 'true']) {
        const boxes = await JwtSignBoxSource.generateBoxes(payload, {
          jwtsign: 'secret',
        });
        expect(boxes).toHaveLength(1);
        expect(boxes[0].props.plaintextOutput.toLowerCase()).toContain(
          'must be a json object',
        );
      }
    });
  });
});
