import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { AtbashBoxSource } from '../AtbashBoxSource';

describe('AtbashBoxSource', () => {
  describe('generateBoxes - gate conditions', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await AtbashBoxSource.generateBoxes('hello', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when options object has no atbash key', async () => {
      const boxes = await AtbashBoxSource.generateBoxes('hello', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input with ::atbash', async () => {
      const boxes = await AtbashBoxSource.generateBoxes('', { atbash: true });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for whitespace-only input with ::atbash', async () => {
      const boxes = await AtbashBoxSource.generateBoxes('   ', {
        atbash: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - cipher correctness', () => {
    it('transforms "hello" to "svool"', async () => {
      // h→s, e→v, l→o, l→o, o→l
      const boxes = await AtbashBoxSource.generateBoxes('hello', {
        atbash: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('svool');
    });

    it('transforms "ABC" to "ZYX"', async () => {
      const boxes = await AtbashBoxSource.generateBoxes('ABC', {
        atbash: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('ZYX');
    });

    it('preserves case and punctuation: "Hello, World!" → "Svool, Dliow!"', async () => {
      const boxes = await AtbashBoxSource.generateBoxes('Hello, World!', {
        atbash: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('Svool, Dliow!');
    });

    it('is self-inverse: atbash(atbash(x)) === x', async () => {
      const original = 'The quick brown fox jumps over the lazy dog.';
      const once = await AtbashBoxSource.generateBoxes(original, {
        atbash: true,
      });
      const twice = await AtbashBoxSource.generateBoxes(
        once[0].props.plaintextOutput,
        { atbash: true },
      );
      expect(twice[0].props.plaintextOutput).toBe(original);
    });
  });

  describe('generateBoxes - box properties', () => {
    it('sets name to "Atbash"', async () => {
      const boxes = await AtbashBoxSource.generateBoxes('hello', {
        atbash: true,
      });
      expect(boxes[0].props.name).toBe('Atbash');
    });

    it('uses DefaultBoxTemplate', async () => {
      const boxes = await AtbashBoxSource.generateBoxes('hello', {
        atbash: true,
      });
      expect(boxes[0].boxTemplate).toBe(DefaultBoxTemplate);
    });

    it('sets showExpandButton to false', async () => {
      const boxes = await AtbashBoxSource.generateBoxes('hello', {
        atbash: true,
      });
      expect(boxes[0].props.showExpandButton).toBe(false);
    });

    it('sets priority from source priority', async () => {
      const boxes = await AtbashBoxSource.generateBoxes('hello', {
        atbash: true,
      });
      expect(boxes[0].props.priority).toBe(AtbashBoxSource.priority);
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(AtbashBoxSource.name).toBe('Atbash');
      expect(AtbashBoxSource.kind).toBe('Encode');
      expect(typeof AtbashBoxSource.priority).toBe('number');
    });
  });
});
