import { DefaultBox } from '@components/Boxes';
import { expect } from '@jest/globals';

import { URLDecodeBoxSource } from '../URLDecodeBox';

describe('URLDecodeBoxSource', () => {
  describe('checkMatch', () => {
    it('should return undefined for empty input', () => {
      expect(URLDecodeBoxSource.checkMatch('')).toBeUndefined();
    });

    it('should return undefined for strings without encoded characters', () => {
      expect(URLDecodeBoxSource.checkMatch('hello world')).toBeUndefined();
      expect(URLDecodeBoxSource.checkMatch('https://example.com')).toBeUndefined();
    });

    it('should decode URL encoded strings', () => {
      const result = URLDecodeBoxSource.checkMatch('hello%20world');
      expect(result).toBeDefined();
      expect(result?.decodedText).toBe('hello world');
    });

    it('should decode complex URLs', () => {
      const result = URLDecodeBoxSource.checkMatch('https://www.google.com/search?q=hello%20world&lang=en%20US');
      expect(result).toBeDefined();
      expect(result?.decodedText).toBe('https://www.google.com/search?q=hello world&lang=en US');
    });

    it('should handle special characters', () => {
      const result = URLDecodeBoxSource.checkMatch('Space%20%26%20Special%20%3F%20Chars%21');
      expect(result).toBeDefined();
      expect(result?.decodedText).toBe('Space & Special ? Chars!');
    });
  });

  describe('generateBoxes', () => {
    it('should return empty array for non-encoded string', async () => {
      const boxes = await URLDecodeBoxSource.generateBoxes('hello world');
      expect(boxes).toHaveLength(0);
    });

    it('should generate box for encoded URL', async () => {
      const input = 'https://example.com/path?query=hello%20world';
      const boxes = await URLDecodeBoxSource.generateBoxes(input);
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('URLEncode decode');
      expect(boxes[0].props.stdout).toBe('https://example.com/path?query=hello world');
      expect(boxes[0].props.priority).toBe(10);
      expect(boxes[0].component).toBe(DefaultBox);
    });
  });
});
