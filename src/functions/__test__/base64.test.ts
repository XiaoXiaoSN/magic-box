import { expect } from 'vitest';

import { base64 } from '../base64';

describe('base64 functions', () => {
  describe('decode Base64', () => {
    it('should decode a base64 string', () => {
      let result = base64.decodeBase64('SGVsbG8gV29ybGQh');
      expect(result).toEqual({
        decoded: new Uint8Array([
          72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100, 33,
        ]),
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

    it('should reject malformed UTF-8 instead of returning replacement text', () => {
      const result = base64.decodeBase64('QQ//');
      expect(result).toEqual({
        decoded: new Uint8Array([65, 15, 255]),
        readableText: null,
      });
    });

    it('should reject control characters other than tab and newlines', () => {
      expect(base64.decodeBase64('QQA=')).toEqual({
        decoded: new Uint8Array([65, 0]),
        readableText: null,
      });
      expect(base64.decodeBase64('QQk=')).toEqual({
        decoded: new Uint8Array([65, 9]),
        readableText: 'A\t',
      });
    });

    it('should decode MIME whitespace, URL-safe, and missing-padding input', () => {
      expect(base64.decodeBase64('SGVs\r\nbG8').readableText).toBe('Hello');
      expect(base64.decodeBase64('SGVsbG8_').decoded).toEqual(
        new Uint8Array([72, 101, 108, 108, 111, 63]),
      );
    });

    it('should use a stable binary fallback for PNG and JPEG headers', () => {
      const png = base64.decodeBase64('iVBORw0KGgo=');
      const jpeg = base64.decodeBase64('/9j/4AAQSkZJRgABAQAAAQABAAD/');

      expect(png.readableText).toBeNull();
      expect(jpeg.readableText).toBeNull();
      expect(png.decoded[0]).toBe(0x89);
      expect(jpeg.decoded[0]).toBe(0xff);
    });

    it('should throw an error for invalid base64 string', () => {
      expect(() => base64.decodeBase64('invalid!!')).toThrow();
      expect(() => base64.decodeBase64('abcde')).toThrow(
        'Invalid base64 string',
      );
      expect(() => base64.decodeBase64('AA=A')).toThrow(
        'Invalid base64 string',
      );
      expect(() => base64.decodeBase64('A')).toThrow('Invalid base64 string');
    });
  });
});
