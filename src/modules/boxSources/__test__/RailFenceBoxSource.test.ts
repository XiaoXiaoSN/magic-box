import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { RailFenceBoxSource } from '../RailFenceBoxSource';

describe('RailFenceBoxSource', () => {
  describe('gate conditions', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await RailFenceBoxSource.generateBoxes(
        'WEAREDISCOVEREDFLEEATONCE',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when options object has no relevant keys', async () => {
      const boxes = await RailFenceBoxSource.generateBoxes(
        'WEAREDISCOVEREDFLEEATONCE',
        {},
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input', async () => {
      const boxes = await RailFenceBoxSource.generateBoxes('', {
        railfence: '3',
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for input exceeding MAX_INPUT', async () => {
      const boxes = await RailFenceBoxSource.generateBoxes(
        'a'.repeat(100_001),
        { railfence: '3' },
      );
      expect(boxes).toHaveLength(0);
    });
  });

  describe('encode — canonical 3-rail vector', () => {
    it('encodes WEAREDISCOVEREDFLEEATONCE with 3 rails to WECRLTEERDSOEEFEAOCAIVDEN', async () => {
      const boxes = await RailFenceBoxSource.generateBoxes(
        'WEAREDISCOVEREDFLEEATONCE',
        { railfence: '3' },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Rail Fence (Encode)');
      expect(boxes[0].props.plaintextOutput).toBe('WECRLTEERDSOEEFEAOCAIVDEN');
      expect(boxes[0].boxTemplate).toBe(DefaultBoxTemplate);
      expect(boxes[0].props.showExpandButton).toBe(false);
    });
  });

  describe('decode — canonical 3-rail vector', () => {
    it('decodes WECRLTEERDSOEEFEAOCAIVDEN with 3 rails to WEAREDISCOVEREDFLEEATONCE', async () => {
      const boxes = await RailFenceBoxSource.generateBoxes(
        'WECRLTEERDSOEEFEAOCAIVDEN',
        { railfencedecode: '3' },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Rail Fence (Decode)');
      expect(boxes[0].props.plaintextOutput).toBe('WEAREDISCOVEREDFLEEATONCE');
    });
  });

  describe('round-trip', () => {
    it('round-trips HELLO WORLD with 4 rails', async () => {
      const encBoxes = await RailFenceBoxSource.generateBoxes('HELLO WORLD', {
        railfence: '4',
      });
      expect(encBoxes).toHaveLength(1);
      const encoded = encBoxes[0].props.plaintextOutput;

      const decBoxes = await RailFenceBoxSource.generateBoxes(encoded, {
        railfencedecode: '4',
      });
      expect(decBoxes).toHaveLength(1);
      expect(decBoxes[0].props.plaintextOutput).toBe('HELLO WORLD');
    });
  });

  describe('N=2 edge case', () => {
    it('encodes abcdef with 2 rails to acebdf', async () => {
      const boxes = await RailFenceBoxSource.generateBoxes('abcdef', {
        railfence: '2',
      });
      expect(boxes).toHaveLength(1);
      // rails: a c e / b d f → "ace" + "bdf"
      expect(boxes[0].props.plaintextOutput).toBe('acebdf');
    });
  });

  describe('both encode and decode options', () => {
    it('returns 2 boxes when both ::railfence and ::railfencedecode are set', async () => {
      const boxes = await RailFenceBoxSource.generateBoxes(
        'WEAREDISCOVEREDFLEEATONCE',
        { railfence: '3', railfencedecode: '3' },
      );
      expect(boxes).toHaveLength(2);
      const names = boxes.map((b) => b.props.name);
      expect(names).toContain('Rail Fence (Encode)');
      expect(names).toContain('Rail Fence (Decode)');
    });
  });

  describe('rail clamping', () => {
    it('clamps rail count below MIN to 2', async () => {
      // rails=1 is invalid; should clamp to 2 and not throw
      const boxes = await RailFenceBoxSource.generateBoxes('abcdef', {
        railfence: '1',
      });
      expect(boxes).toHaveLength(1);
      // 2-rail result matches known good output
      expect(boxes[0].props.plaintextOutput).toBe('acebdf');
    });

    it('uses default of 3 rails when option value is boolean true', async () => {
      const boxes = await RailFenceBoxSource.generateBoxes(
        'WEAREDISCOVEREDFLEEATONCE',
        { railfence: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('WECRLTEERDSOEEFEAOCAIVDEN');
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(RailFenceBoxSource.name).toBe('Rail Fence');
      expect(RailFenceBoxSource.tag).toBe('#');
      expect(RailFenceBoxSource.kind).toBe('Encode');
      expect(typeof RailFenceBoxSource.priority).toBe('number');
    });
  });
});
