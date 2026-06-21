import { describe, expect, it, vi } from 'vitest';

import { JwtVerifyBoxSource } from '../JwtVerifyBoxSource';

// canonical jwt.io HS256 example token and secret
const CANONICAL_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
const CANONICAL_SECRET = 'your-256-bit-secret';

describe('JwtVerifyBoxSource', () => {
  describe('trigger guard', () => {
    it('returns [] when ::jwtverify option is absent', async () => {
      const boxes = await JwtVerifyBoxSource.generateBoxes(
        CANONICAL_TOKEN,
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when options object has no jwtverify key', async () => {
      const boxes = await JwtVerifyBoxSource.generateBoxes(CANONICAL_TOKEN, {
        hash: 'sha256',
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('secret validation', () => {
    it('returns an explanatory box when ::jwtverify is bare (boolean true)', async () => {
      const boxes = await JwtVerifyBoxSource.generateBoxes(CANONICAL_TOKEN, {
        jwtverify: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput.toLowerCase()).toMatch(/secret/);
    });

    it('returns an explanatory box when secret is an empty string', async () => {
      const boxes = await JwtVerifyBoxSource.generateBoxes(CANONICAL_TOKEN, {
        jwtverify: '',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput.toLowerCase()).toMatch(/secret/);
    });
  });

  describe('token format validation', () => {
    it('returns a malformed-token box for non-JWT input', async () => {
      const boxes = await JwtVerifyBoxSource.generateBoxes('abc', {
        jwtverify: 'x',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput.toLowerCase()).toMatch(/malformed/);
    });

    it('returns a malformed-token box for a two-part dotted string', async () => {
      const boxes = await JwtVerifyBoxSource.generateBoxes('a.b', {
        jwtverify: 'x',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput.toLowerCase()).toMatch(/malformed/);
    });
  });

  describe('algorithm guard', () => {
    it('returns an unsupported-alg box for a non-HS256 token', async () => {
      // manually constructed RS256 header (alg changed; signature won't verify, but alg check comes first)
      const rs256Header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      const payloadB64 = 'eyJzdWIiOiJ0ZXN0In0';
      const fakeToken = `${rs256Header}.${payloadB64}.fakesig`;
      const boxes = await JwtVerifyBoxSource.generateBoxes(fakeToken, {
        jwtverify: 'secret',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput.toLowerCase()).toMatch(
        /hs256|unsupported|only/,
      );
    });
  });

  describe('signature verification', () => {
    it('reports Signature=valid for the canonical jwt.io token with correct secret', async () => {
      const boxes = await JwtVerifyBoxSource.generateBoxes(CANONICAL_TOKEN, {
        jwtverify: CANONICAL_SECRET,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Signature).toBe('valid');
      expect(opts.Algorithm).toBe('HS256');
    });

    it('reports Signature=invalid when a wrong secret is used', async () => {
      const boxes = await JwtVerifyBoxSource.generateBoxes(CANONICAL_TOKEN, {
        jwtverify: 'wrong',
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Signature).toBe('invalid');
    });

    it('does not include the secret value anywhere in the output', async () => {
      const boxes = await JwtVerifyBoxSource.generateBoxes(CANONICAL_TOKEN, {
        jwtverify: CANONICAL_SECRET,
      });
      const box = boxes[0];
      expect(box.props.plaintextOutput).not.toContain(CANONICAL_SECRET);
      const optsStr = JSON.stringify(box.props.options);
      expect(optsStr).not.toContain(CANONICAL_SECRET);
    });
  });

  describe('payload decoding', () => {
    it('includes the decoded payload as compact JSON in options', async () => {
      const boxes = await JwtVerifyBoxSource.generateBoxes(CANONICAL_TOKEN, {
        jwtverify: CANONICAL_SECRET,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      const payload = JSON.parse(opts.Payload);
      expect(payload.sub).toBe('1234567890');
      expect(payload.name).toBe('John Doe');
      expect(payload.iat).toBe(1516239022);
    });

    it('reports Expired=n/a when no exp claim is present', async () => {
      const boxes = await JwtVerifyBoxSource.generateBoxes(CANONICAL_TOKEN, {
        jwtverify: CANONICAL_SECRET,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      // canonical token has no exp claim
      expect(opts.Expired).toBe('n/a');
    });
  });

  describe('plaintextOutput format', () => {
    it('builds k: v lines that include all four keys', async () => {
      const boxes = await JwtVerifyBoxSource.generateBoxes(CANONICAL_TOKEN, {
        jwtverify: CANONICAL_SECRET,
      });
      const text = boxes[0].props.plaintextOutput;
      expect(text).toMatch(/Signature: (valid|invalid)/);
      expect(text).toMatch(/Algorithm: HS256/);
      expect(text).toMatch(/Payload: /);
      expect(text).toMatch(/Expired: /);
    });
  });

  describe('secure context guard', () => {
    it('returns an explanatory box when crypto.subtle is unavailable', async () => {
      // temporarily hide crypto.subtle to simulate a non-secure context
      const originalSubtle = crypto.subtle;
      vi.spyOn(crypto, 'subtle', 'get').mockReturnValue(
        undefined as unknown as SubtleCrypto,
      );

      try {
        const boxes = await JwtVerifyBoxSource.generateBoxes(CANONICAL_TOKEN, {
          jwtverify: CANONICAL_SECRET,
        });
        expect(boxes).toHaveLength(1);
        expect(boxes[0].props.plaintextOutput.toLowerCase()).toMatch(
          /secure context|crypto\.subtle/,
        );
      } finally {
        vi.spyOn(crypto, 'subtle', 'get').mockReturnValue(originalSubtle);
      }
    });
  });
});
