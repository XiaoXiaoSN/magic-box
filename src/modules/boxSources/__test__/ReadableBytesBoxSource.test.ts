import { expect } from 'vitest';

import { DefaultBoxTemplate } from '@components/BoxTemplate';

import { ReadableBytesBoxSource } from '../ReadableBytesBoxSource';

describe('ReadableBytesBoxSource', () => {
  describe('checkMatch', () => {
    it('should return undefined for empty input', () => {
      expect(ReadableBytesBoxSource.checkMatch('')).toBeUndefined();
    });

    it('should decode space-separated decimal', () => {
      const result = ReadableBytesBoxSource.checkMatch('72 101 108 108 111');
      expect(result).toBeDefined();
      expect(result?.decodedText).toBe('Hello');
    });

    it('should decode [comma, space] decimal', () => {
      const result = ReadableBytesBoxSource.checkMatch('[72, 101, 108, 108, 111]');
      expect(result).toBeDefined();
      expect(result?.decodedText).toBe('Hello');
    });

    it('should decode Go-style []byte{} decimal', () => {
      const result = ReadableBytesBoxSource.checkMatch('[]byte{72, 101, 108, 108, 111}');
      expect(result).toBeDefined();
      expect(result?.decodedText).toBe('Hello');
    });

    it('should decode space-separated hex with 0x', () => {
      const result = ReadableBytesBoxSource.checkMatch('0x48 0x65 0x6c 0x6c 0x6f');
      expect(result).toBeDefined();
      expect(result?.decodedText).toBe('Hello');
    });

    it('should decode space-separated hex (a-f)', () => {
      const result = ReadableBytesBoxSource.checkMatch('48 65 6c 6c 6f');
      expect(result).toBeDefined();
      expect(result?.decodedText).toBe('Hello');
    });

    it('should decode utf-8: 中文', () => {
      // 中文 = [228, 184, 173, 230, 150, 135]
      const result = ReadableBytesBoxSource.checkMatch('228 184 173 230 150 135');
      expect(result).toBeDefined();
      expect(result?.decodedText).toBe('中文');
    });

    it('should decode utf-8: emoji', () => {
      // 😀 = [240, 159, 152, 128]
      const result = ReadableBytesBoxSource.checkMatch('240 159 152 128');
      expect(result).toBeDefined();
      expect(result?.decodedText).toBe('😀');
    });

    it('should decode with control character', () => {
      // 😀 = [240, 159, 152, 128, 11]
      const result = ReadableBytesBoxSource.checkMatch('240 159 152 128 12');
      expect(result).toBeDefined();
      expect(result?.decodedText).toContain('😀');
    });

    it('should not decode with only control character', () => {
      const result = ReadableBytesBoxSource.checkMatch('11 12 14');
      expect(result).toBeUndefined();
    });

    it('should return undefined for invalid byte values', () => {
      expect(ReadableBytesBoxSource.checkMatch('300')).toBeUndefined();
      expect(ReadableBytesBoxSource.checkMatch('-1')).toBeUndefined();
      expect(ReadableBytesBoxSource.checkMatch('0xGG')).toBeUndefined();
      expect(ReadableBytesBoxSource.checkMatch('72 hello')).toBeUndefined();
    });
  });

  describe('generateBoxes', () => {
    it('should return empty array for non-matching input', async () => {
      const boxes = await ReadableBytesBoxSource.generateBoxes('not a bytearray');
      expect(boxes).toHaveLength(0);
    });

    it('should generate box for decimal byte array', async () => {
      const boxes = await ReadableBytesBoxSource.generateBoxes('72 101 108 108 111');
      expect(boxes).toHaveLength(1);
      const box = boxes[0];
      expect(box.props.name).toBe('ByteArray to String');
      expect(box.props.plaintextOutput).toBe('Hello');
      expect(box.props.priority).toBe(10);
      expect(box.component).toBe(DefaultBoxTemplate);
    });

    it('should generate box for utf-8 emoji', async () => {
      const boxes = await ReadableBytesBoxSource.generateBoxes('240 159 152 128');
      expect(boxes).toHaveLength(1);
      const box = boxes[0];
      expect(box.props.plaintextOutput).toBe('😀');
    });
  });
});
