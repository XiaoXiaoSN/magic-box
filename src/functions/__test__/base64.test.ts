import { expect } from '@jest/globals';

import base64 from '../base64';

describe('base64 functions', () => {
  describe('decode Base64', () => {
    it('should decode a base64 string', () => {
      let result = base64.decodeBase64('SGVsbG8gV29ybGQh');
      expect(result).toEqual({
        decoded: new Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100, 33]),
        readableText: 'Hello World!',
      });

      result = base64.decodeBase64('QUJD');
      expect(result).toEqual({
        decoded: new Uint8Array([65, 66, 67]),
        readableText: 'ABC',
      });

      result = base64.decodeBase64('6a2U6KGT566x');
      expect(result).toEqual({
        decoded: new Uint8Array([233, 173, 148, 232, 161, 147, 231, 174, 177]),
        readableText: '魔術箱',
      });
    });

    it('should decode unreadable text', () => {
      const result = base64.decodeBase64('AAAA');
      expect(result).toEqual({
        decoded: new Uint8Array([0, 0, 0]),
        readableText: null,
      });
    });

    it('should throw an error for invalid base64 string', () => {
      expect(() => base64.decodeBase64('invalid!!')).toThrow();
    });
  });
});
