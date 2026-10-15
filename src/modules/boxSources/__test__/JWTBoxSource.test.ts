import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JWTBoxSource } from '../JWTBoxSource';

describe('JWTBoxSource', () => {
  const validJWT =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

  const encode = (value: string): string =>
    btoa(value).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');

  const signedJwt = async (
    algorithm: 'HS256' | 'HS384' | 'HS512',
    secret: string,
    body: Record<string, unknown>,
  ): Promise<string> => {
    const header = encode(JSON.stringify({ alg: algorithm, typ: 'JWT' }));
    const payload = encode(JSON.stringify(body));
    const signingInput = `${header}.${payload}`;
    const hash = `SHA-${algorithm.slice(2)}` as
      | 'SHA-256'
      | 'SHA-384'
      | 'SHA-512';
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash },
      false,
      ['sign'],
    );
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(signingInput),
    );
    const encodedSignature = btoa(
      String.fromCharCode(...new Uint8Array(signature)),
    )
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replace(/=+$/, '');
    return `${signingInput}.${encodedSignature}`;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('checkMatch', () => {
    it('should return undefined for empty input', () => {
      expect(JWTBoxSource.checkMatch('')).toBeUndefined();
    });

    it('should return undefined for invalid JWT', () => {
      expect(JWTBoxSource.checkMatch('invalid-jwt')).toBeUndefined();
      expect(JWTBoxSource.checkMatch('abc.def.ghi')).toBeUndefined();
    });

    it('should decode valid JWT', () => {
      const result = JWTBoxSource.checkMatch(validJWT);
      expect(result).toBeDefined();

      const parsed = JSON.parse(result?.jwtStr ?? '');
      expect(parsed.header).toEqual({
        alg: 'HS256',
        typ: 'JWT',
      });
      expect(parsed.body).toEqual({
        sub: '1234567890',
        name: 'John Doe',
        iat: 1516239022,
      });
    });

    it('accepts a case-insensitive Bearer prefix', () => {
      expect(JWTBoxSource.checkMatch(`bEaReR ${validJWT}`)).toBeDefined();
    });

    it('rejects JWTs whose header is a number or array', () => {
      expect(JWTBoxSource.checkMatch('MTIz.MTIz')).toBeUndefined();
      expect(JWTBoxSource.checkMatch('WzFd.MTIz')).toBeUndefined();
    });
  });

  describe('generateBoxes', () => {
    it('should return empty array for invalid JWT', async () => {
      const boxes = await JWTBoxSource.generateBoxes('invalid-jwt');
      expect(boxes).toHaveLength(0);
    });

    it('should generate box for valid JWT', async () => {
      const boxes = await JWTBoxSource.generateBoxes(validJWT);
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('JWT Decode');
      expect(boxes[0].props.priority).toBe(10);
      expect(boxes[0].props.options).toEqual(
        expect.objectContaining({
          language: 'json',
          Signature: 'Unverified (decode only)',
          'Issued At': '2018-01-18T09:30:22.000+08:00',
          Validity: 'No validity window',
        }),
      );

      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(parsed.header.alg).toBe('HS256');
      expect(parsed.body.name).toBe('John Doe');
      expect(parsed.details.Signature).toBe('Unverified (decode only)');

      expect(boxes[0].view).toBe('code');
    });

    it('renders NumericDate claims and status in the preferred timezone', async () => {
      const token = await signedJwt('HS256', 'secret', {
        exp: 1704067260,
        iat: 1704067200,
        nbf: 1704067190,
      });
      const boxes = await JWTBoxSource.generateBoxes(`Bearer ${token}`);
      const details = boxes[0].props.options as Record<string, string>;

      expect(details.Expiration).toBe('2024-01-01T08:01:00.000+08:00');
      expect(details['Issued At']).toBe('2024-01-01T08:00:00.000+08:00');
      expect(details['Not Before']).toBe('2024-01-01T07:59:50.000+08:00');
      expect(details.Validity).toBe('Valid (remaining 1m)');
    });

    it('verifies HS256/384/512 and keeps signature status separate', async () => {
      for (const algorithm of ['HS256', 'HS384', 'HS512'] as const) {
        const token = await signedJwt(algorithm, 'secret', { exp: 4102444800 });
        const valid = await JWTBoxSource.generateBoxes(token, {
          secret: 'secret',
        });
        expect(valid[0].props.options?.Signature).toBe('Valid');

        const invalid = await JWTBoxSource.generateBoxes(token, {
          secret: 'wrong',
        });
        expect(invalid[0].props.options?.Signature).toBe('Invalid');
      }
    });

    it('does not echo a verification secret', async () => {
      const token = await signedJwt('HS256', 'private-key', {});
      const [box] = await JWTBoxSource.generateBoxes(token, {
        secret: 'private-key',
      });
      expect(box.props.plaintextOutput).not.toContain('private-key');
      expect(box.props.options).not.toHaveProperty('secret');
    });

    it('rejects tampered payloads and unsupported algorithms with a secret', async () => {
      const token = await signedJwt('HS256', 'secret', { exp: 4102444800 });
      const [header, payload, signature] = token.split('.');
      const tamperedPayload = encode(JSON.stringify({ exp: 4102444801 }));
      const tampered = await JWTBoxSource.generateBoxes(
        `${header}.${tamperedPayload}.${signature}`,
        { secret: 'secret' },
      );
      expect(tampered[0].props.options?.Signature).toBe('Invalid');

      const unsupportedHeader = encode(
        JSON.stringify({ alg: 'RS256', typ: 'JWT' }),
      );
      const unsupported = await JWTBoxSource.generateBoxes(
        `${unsupportedHeader}.${payload}.${signature}`,
        { secret: 'secret' },
      );
      expect(unsupported[0].props.plaintextOutput).toMatch(/HS256/i);
    });

    it('does not report a token without exp or nbf as valid', async () => {
      const boxes = await JWTBoxSource.generateBoxes(validJWT);
      expect(boxes[0].props.options?.Validity).toBe('No validity window');
    });

    it('treats exp and nbf as independent validity bounds', async () => {
      const expOnly = await signedJwt('HS256', 'secret', { exp: 4102444800 });
      const nbfOnly = await signedJwt('HS256', 'secret', { nbf: 1704067190 });

      const expBox = (await JWTBoxSource.generateBoxes(expOnly))[0];
      const nbfBox = (await JWTBoxSource.generateBoxes(nbfOnly))[0];
      expect(expBox.props.options?.Validity).toMatch(/^Valid \(remaining /);
      expect(nbfBox.props.options?.Validity).toBe('Valid (no expiration)');
    });

    it('rejects invalid validity claims while keeping iat informational', async () => {
      for (const body of [{ exp: '1704067200' }, { nbf: 8_640_000_000_001 }]) {
        const token = await signedJwt('HS256', 'secret', body);
        const boxes = await JWTBoxSource.generateBoxes(token);
        expect(boxes[0].props.options?.Validity).toBe(
          'Invalid NumericDate claim',
        );
      }

      const token = await signedJwt('HS256', 'secret', {
        iat: Number.POSITIVE_INFINITY,
      });
      const [box] = await JWTBoxSource.generateBoxes(token);
      expect(box.props.options?.['Issued At']).toBe('Invalid NumericDate');
      expect(box.props.options?.Validity).toBe('No validity window');
    });

    it('rejects none, padded, malformed, and oversized tokens', () => {
      expect(
        JWTBoxSource.checkMatch(
          `${encode(JSON.stringify({ alg: 'none' }))}.${encode('{}')}.`,
        ),
      ).toBeUndefined();
      expect(
        JWTBoxSource.checkMatch('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0=.abcd'),
      ).toBeUndefined();
      expect(
        JWTBoxSource.checkMatch(`a.${'a'.repeat(20_000)}.b`),
      ).toBeUndefined();
    });
  });
});
