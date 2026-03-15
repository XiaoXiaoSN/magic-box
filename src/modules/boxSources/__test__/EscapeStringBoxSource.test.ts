import { expect } from 'vitest';

import { DefaultBoxTemplate } from '@components/BoxTemplate';

import { EscapeStringBoxSource } from '../EscapeStringBoxSource';

describe('EscapeStringBoxSource', () => {
  describe('checkMatch', () => {
    it('should return undefined for empty input', () => {
      expect(EscapeStringBoxSource.checkMatch('')).toBeUndefined();
    });

    it('should return undefined for plain strings without escapes', () => {
      expect(EscapeStringBoxSource.checkMatch('hello world')).toBeUndefined();
      expect(EscapeStringBoxSource.checkMatch('{"message":"something"}')).toBeUndefined();
    });

    it('should detect escaped quotes and unescape them', () => {
      const result = EscapeStringBoxSource.checkMatch('{\\\"message\\\":\\\"something here\\\"}');
      expect(result).toBeDefined();
      expect(result?.unescapedText).toBe('{"message":"something here"}');
    });

    it('should strip wrapping outer double-quotes', () => {
      const result = EscapeStringBoxSource.checkMatch('"{\\\"message\\\":\\\"something here\\\"}"');
      expect(result).toBeDefined();
      expect(result?.unescapedText).toBe('{"message":"something here"}');
    });

    it('should strip ANSI color codes', () => {
      const result = EscapeStringBoxSource.checkMatch('\x1B[31mHello\x1B[0m World');
      expect(result).toBeDefined();
      expect(result?.unescapedText).toBe('Hello World');
    });

    it('should handle input with both escaped quotes and ANSI codes', () => {
      const result = EscapeStringBoxSource.checkMatch('\x1B[32m{\\\"key\\\":\\\"value\\\"}\x1B[0m');
      expect(result).toBeDefined();
      expect(result?.unescapedText).toBe('{"key":"value"}');
    });

    it('should unescape \\n and \\t as well', () => {
      const result = EscapeStringBoxSource.checkMatch('{\\\"line1\\\":\\\"a\\\\nb\\\"}');
      expect(result).toBeDefined();
      expect(result?.unescapedText).toContain('"line1"');
    });

    it('should handle various ANSI CSI sequences', () => {
      // Cursor movement, erase, SGR
      const input = '\x1B[1;32mBold Green\x1B[0m\x1B[2Kerase';
      const result = EscapeStringBoxSource.checkMatch(input);
      expect(result).toBeDefined();
      expect(result?.unescapedText).toBe('Bold Greenerase');
    });

    it('should handle literal "^[" representing ANSI codes', () => {
      const input = '^[[2m2026-03-15T05:43:40.072934Z^[[0m ^[[32m INFO^[[0m';
      const result = EscapeStringBoxSource.checkMatch(input);
      expect(result).toBeDefined();
      expect(result?.unescapedText).toBe('2026-03-15T05:43:40.072934Z  INFO');
    });

    it('should handle user provided ANSI example', () => {
      const input = '\x1B[2m2026-03-15T05:43:40.072934Z\x1B[0m \x1B[32m INFO\x1B[0m processor-worker ThreadId(17) \x1B[1msubscribe\x1B[0m\x1B[1m{\x1B[0m\x1B[3mexchange\x1B[0m\x1B[2m=\x1B[0m"Hyperliquid" \x1B[3mshard\x1B[0m\x1B[2m=\x1B[0m2 \x1B[3mreplica\x1B[0m\x1B[2m=\x1B[0m1\x1B[1m}\x1B[0m\x1B[2m:\x1B[0m \x1B[2mmarket::websocket::manager\x1B[0m\x1B[2m:\x1B[0m Will reconnect after 20.14 hours';
      const result = EscapeStringBoxSource.checkMatch(input);
      expect(result).toBeDefined();
      expect(result?.unescapedText).toBe('2026-03-15T05:43:40.072934Z  INFO processor-worker ThreadId(17) subscribe{exchange="Hyperliquid" shard=2 replica=1}: market::websocket::manager: Will reconnect after 20.14 hours');
    });
  });

  describe('generateBoxes', () => {
    it('should return empty array for plain string', async () => {
      const boxes = await EscapeStringBoxSource.generateBoxes('hello world');
      expect(boxes).toHaveLength(0);
    });

    it('should generate box for escaped JSON string', async () => {
      const input = '{\\\"message\\\":\\\"something here\\\"}';
      const boxes = await EscapeStringBoxSource.generateBoxes(input);
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Escape String');
      expect(boxes[0].props.plaintextOutput).toBe('{"message":"something here"}');
      expect(boxes[0].props.priority).toBe(15);
      expect(boxes[0].boxTemplate).toBe(DefaultBoxTemplate);
    });

    it('should generate box stripping ANSI codes', async () => {
      const input = '\x1B[31mred text\x1B[0m';
      const boxes = await EscapeStringBoxSource.generateBoxes(input);
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('red text');
    });
  });
});
