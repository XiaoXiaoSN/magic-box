import { expect } from 'vitest';

import { CodeBoxTemplate } from '@components/BoxTemplate';

import { JWTBoxSource } from '../JWTBoxSource';

describe('JWTBoxSource', () => {
  const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

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
      expect(boxes[0].props.options).toEqual({ language: 'json' });

      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(parsed.header.alg).toBe('HS256');
      expect(parsed.body.name).toBe('John Doe');

      expect(boxes[0].boxTemplate).toBe(CodeBoxTemplate);
    });
  });
});
