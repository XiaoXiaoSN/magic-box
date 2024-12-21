import { expect } from '@jest/globals';

import {
  isArray,
  isBase64,
  isJSON,
  isNumeric,
  isObject,
  isRFC3339,
  isString,
  toNumeric,
  trim,
} from '../helper';

describe('helper functions', () => {
  describe('isNumeric', () => {
    it('should return true for valid numbers', () => {
      expect(isNumeric(123)).toBe(true);
      expect(isNumeric('123')).toBe(true);
      expect(isNumeric('-123')).toBe(true);
      expect(isNumeric('123.456')).toBe(true);
      expect(isNumeric('+123')).toBe(true);
    });

    it('should return false for invalid numbers', () => {
      expect(isNumeric('')).toBe(false);
      expect(isNumeric('abc')).toBe(false);
      expect(isNumeric('12.34.56')).toBe(false);
      expect(isNumeric('123abc')).toBe(false);
      expect(isNumeric(null)).toBe(false);
      expect(isNumeric(undefined)).toBe(false);
      expect(isNumeric({})).toBe(false);
    });
  });

  describe('toNumeric', () => {
    it('should convert valid numbers', () => {
      expect(toNumeric(123)).toBe(123);
      expect(toNumeric('123')).toBe(123);
      expect(toNumeric('-123')).toBe(-123);
      expect(toNumeric('123.456')).toBe(123.456);
    });

    it('should return null for invalid numbers', () => {
      expect(toNumeric('')).toBeNull();
      expect(toNumeric('abc')).toBeNull();
      expect(toNumeric('12.34.56')).toBeNull();
      expect(toNumeric(null)).toBeNull();
      expect(toNumeric(undefined)).toBeNull();
      expect(toNumeric({})).toBeNull();
    });
  });

  describe('isString', () => {
    it('should return true for strings', () => {
      expect(isString('')).toBe(true);
      expect(isString('hello')).toBe(true);
      expect(isString(String('hello'))).toBe(true);
    });

    it('should return false for non-strings', () => {
      expect(isString(123)).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
      expect(isString({})).toBe(false);
      expect(isString([])).toBe(false);
    });
  });

  describe('isArray', () => {
    it('should return true for arrays', () => {
      expect(isArray([])).toBe(true);
      expect(isArray([1, 2, 3])).toBe(true);
    });

    it('should return false for non-arrays', () => {
      expect(isArray({})).toBe(false);
      expect(isArray('array')).toBe(false);
      expect(isArray(123)).toBe(false);
      expect(isArray(null)).toBe(false);
      expect(isArray(undefined)).toBe(false);
    });
  });

  describe('isObject', () => {
    it('should return true for objects', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ key: 'value' })).toBe(true);
      expect(isObject([])).toBe(true); // Arrays are objects in JavaScript
    });

    it('should return false for non-objects', () => {
      expect(isObject(null)).toBe(false);
      expect(isObject(undefined)).toBe(false);
      expect(isObject('object')).toBe(false);
      expect(isObject(123)).toBe(false);
    });
  });

  describe('trim', () => {
    it('should remove whitespace from both ends', () => {
      expect(trim('  hello  ')).toBe('hello');
      expect(trim('\thello\n')).toBe('hello');
      expect(trim('hello')).toBe('hello');
    });

    it('should handle empty strings', () => {
      expect(trim('')).toBe('');
      expect(trim('   ')).toBe('');
    });
  });

  describe('isRFC3339', () => {
    it('should return true for valid RFC3339 dates', () => {
      expect(isRFC3339('2024-01-01T00:00:00Z')).toBe(true);
      expect(isRFC3339('2024-12-15T19:34:57.530+08:00')).toBe(true);
      expect(isRFC3339('2024-06-30T23:59:59-07:00')).toBe(true);
    });

    it('should return false for invalid RFC3339 dates', () => {
      expect(isRFC3339('2024-13-01T00:00:00Z')).toBe(false); // Invalid month
      expect(isRFC3339('2024-12-32T00:00:00Z')).toBe(false); // Invalid day
      expect(isRFC3339('2024-12-15 19:34:57')).toBe(false); // Missing T and timezone
      expect(isRFC3339('invalid-date')).toBe(false);
      expect(isRFC3339('')).toBe(false);
    });
  });

  describe('isBase64', () => {
    it('should return true for valid base64 strings', () => {
      expect(isBase64('SGVsbG8gV29ybGQ=')).toBe(true); // "Hello World"
      expect(isBase64('dGVzdA==')).toBe(true); // "test"
      expect(isBase64('YWJjMTIzIT8kKiYoKSctPUB+')).toBe(true);
    });

    it('should return false for invalid base64 strings', () => {
      expect(isBase64('')).toBe(false);
      expect(isBase64('   ')).toBe(false);
      expect(isBase64('hello world')).toBe(false);
      expect(isBase64('SGVsbG8gV29ybGQ')).toBe(false); // Missing padding
      expect(isBase64('SGVsbG8gV29ybGQ===')).toBe(false); // Invalid padding
    });
  });

  describe('isJSON', () => {
    it('should return true for valid JSON strings', () => {
      expect(isJSON('{}')).toBe(true);
      expect(isJSON('[]')).toBe(true);
      expect(isJSON('{"name":"test","value":123}')).toBe(true);
      expect(isJSON('[1,2,3]')).toBe(true);
    });

    it('should return false for invalid JSON strings', () => {
      expect(isJSON('not json')).toBe(false);
      expect(isJSON('{invalid:json}')).toBe(false);
      expect(isJSON('{"unclosed:"object"')).toBe(false);
    });
  });
});
