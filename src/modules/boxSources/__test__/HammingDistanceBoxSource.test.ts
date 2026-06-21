import { describe, expect, it } from 'vitest';

import { HammingDistanceBoxSource } from '../HammingDistanceBoxSource';

describe('HammingDistanceBoxSource', () => {
  describe('option gate', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await HammingDistanceBoxSource.generateBoxes(
        'karolin, kathrin',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when unrelated option is provided', async () => {
      const boxes = await HammingDistanceBoxSource.generateBoxes(
        'karolin, kathrin',
        { sha256: true },
      );
      expect(boxes).toHaveLength(0);
    });
  });

  describe('char-level distance', () => {
    it('karolin vs kathrin → Distance 3, Length 7', async () => {
      // positions 2(r/t), 3(o/h), 4(l/r) differ
      const boxes = await HammingDistanceBoxSource.generateBoxes(
        'karolin, kathrin',
        { hamming: true },
      );
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Distance).toBe('3');
      expect(opts.Length).toBe('7');
      expect(opts.A).toBe('karolin');
      expect(opts.B).toBe('kathrin');
    });

    it('newline-separated "abc\\nabd" → Distance 1', async () => {
      const boxes = await HammingDistanceBoxSource.generateBoxes('abc\nabd', {
        hamming: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Distance).toBe('1');
    });

    it('"1011101, 1001001" → Distance 2', async () => {
      // positions 1(0/0 same), compare: 1011101 vs 1001001
      // idx0:1=1, idx1:0=0, idx2:1=0 ✗, idx3:1=1, idx4:1=0 ✗, idx5:0=0, idx6:1=1 → 2 diffs
      const boxes = await HammingDistanceBoxSource.generateBoxes(
        '1011101, 1001001',
        { hamming: true },
      );
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Distance).toBe('2');
    });

    it('equal strings "foo, foo" → Distance 0', async () => {
      const boxes = await HammingDistanceBoxSource.generateBoxes('foo, foo', {
        hamming: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Distance).toBe('0');
    });
  });

  describe('error cases', () => {
    it('unequal-length strings "abc, ab" → error box mentioning equal-length', async () => {
      const boxes = await HammingDistanceBoxSource.generateBoxes('abc, ab', {
        hamming: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toMatch(/equal-length/i);
      expect(opts['Length A']).toBe('3');
      expect(opts['Length B']).toBe('2');
    });

    it('single operand "abc" (no separator) → error box mentioning two strings', async () => {
      const boxes = await HammingDistanceBoxSource.generateBoxes('abc', {
        hamming: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toMatch(/two strings/i);
    });
  });

  describe('hex bit distance bonus', () => {
    it('"ff, 0f" → Bit Distance 4 (0xff ^ 0x0f = 0xf0 = 4 bits set)', async () => {
      const boxes = await HammingDistanceBoxSource.generateBoxes('ff, 0f', {
        hamming: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      // char-level: 'f'≠'0', 'f'='f' → Distance 1
      expect(opts.Distance).toBe('1');
      // bit-level: 0xf ^ 0x0 = 0xf (4 bits), 0xf ^ 0xf = 0x0 (0 bits) → 4
      expect(opts['Bit Distance']).toBe('4');
    });

    it('"00, ff" → Bit Distance 8', async () => {
      const boxes = await HammingDistanceBoxSource.generateBoxes('00, ff', {
        hamming: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Bit Distance']).toBe('8');
    });

    it('non-hex inputs do not produce Bit Distance key', async () => {
      const boxes = await HammingDistanceBoxSource.generateBoxes(
        'karolin, kathrin',
        { hamming: true },
      );
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Bit Distance']).toBeUndefined();
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(HammingDistanceBoxSource.name).toBe('Hamming Distance');
      expect(HammingDistanceBoxSource.tag).toBe('#');
      expect(HammingDistanceBoxSource.kind).toBe('Calculate');
      expect(typeof HammingDistanceBoxSource.priority).toBe('number');
    });
  });
});
