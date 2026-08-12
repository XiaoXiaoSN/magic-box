import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { PunycodeBoxSource } from '../PunycodeBoxSource';

describe('PunycodeBoxSource', () => {
  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(PunycodeBoxSource.name).toBe('Punycode');
      expect(PunycodeBoxSource.tag).toBe('#');
      expect(PunycodeBoxSource.kind).toBe('Encode');
      expect(typeof PunycodeBoxSource.priority).toBe('number');
    });
  });

  describe('generateBoxes - no option', () => {
    it('returns empty array when no punycode option is provided', async () => {
      const boxes = await PunycodeBoxSource.generateBoxes('münchen.de', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await PunycodeBoxSource.generateBoxes('münchen.de', {});
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - ToASCII (::punycode)', () => {
    it('encodes münchen.de to xn--mnchen-3ya.de', async () => {
      // ground truth: new URL('http://münchen.de').hostname === 'xn--mnchen-3ya.de'
      const boxes = await PunycodeBoxSource.generateBoxes('münchen.de', {
        punycode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Punycode (ToASCII)');
      expect(boxes[0].props.plaintextOutput).toBe('xn--mnchen-3ya.de');
      expect(boxes[0].boxTemplate).toBe(DefaultBoxTemplate);
      expect(boxes[0].props.showExpandButton).toBe(false);
    });

    it('encodes bücher.com to xn--bcher-kva.com', async () => {
      // ground truth: new URL('http://bücher.com').hostname === 'xn--bcher-kva.com'
      const boxes = await PunycodeBoxSource.generateBoxes('bücher.com', {
        punycode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('xn--bcher-kva.com');
    });

    it('leaves pure-ASCII domain unchanged', async () => {
      const boxes = await PunycodeBoxSource.generateBoxes('example.com', {
        punycode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('example.com');
    });

    it('accepts ::punycodeencode alias', async () => {
      const boxes = await PunycodeBoxSource.generateBoxes('münchen.de', {
        punycodeencode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('xn--mnchen-3ya.de');
    });

    it('accepts ::idn alias', async () => {
      const boxes = await PunycodeBoxSource.generateBoxes('münchen.de', {
        idn: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('xn--mnchen-3ya.de');
    });
  });

  describe('generateBoxes - ToUnicode (::punycodedecode)', () => {
    it('decodes xn--mnchen-3ya.de to münchen.de', async () => {
      const boxes = await PunycodeBoxSource.generateBoxes('xn--mnchen-3ya.de', {
        punycodedecode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Punycode (ToUnicode)');
      expect(boxes[0].props.plaintextOutput).toBe('münchen.de');
    });

    it('leaves non-xn-- labels unchanged during decode', async () => {
      const boxes = await PunycodeBoxSource.generateBoxes('example.com', {
        punycodedecode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('example.com');
    });

    it('accepts ::idndecode alias', async () => {
      const boxes = await PunycodeBoxSource.generateBoxes('xn--mnchen-3ya.de', {
        idndecode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('münchen.de');
    });
  });

  describe('generateBoxes - round-trip', () => {
    it('toUnicode(toAscii(münchen.de)) === münchen.de', async () => {
      const asciiBoxes = await PunycodeBoxSource.generateBoxes('münchen.de', {
        punycode: true,
      });
      const ascii = asciiBoxes[0].props.plaintextOutput;
      const unicodeBoxes = await PunycodeBoxSource.generateBoxes(ascii, {
        punycodedecode: true,
      });
      expect(unicodeBoxes[0].props.plaintextOutput).toBe('münchen.de');
    });
  });

  describe('generateBoxes - both options', () => {
    it('returns 2 boxes when both ::punycode and ::punycodedecode are set', async () => {
      const boxes = await PunycodeBoxSource.generateBoxes('münchen.de', {
        punycode: true,
        punycodedecode: true,
      });
      expect(boxes).toHaveLength(2);
      const names = boxes.map((b) => b.props.name);
      expect(names).toContain('Punycode (ToASCII)');
      expect(names).toContain('Punycode (ToUnicode)');
    });
  });

  describe('generateBoxes - input guard', () => {
    it('returns empty array when input exceeds MAX_INPUT', async () => {
      const huge = 'a'.repeat(10_001);
      const boxes = await PunycodeBoxSource.generateBoxes(huge, {
        punycode: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });
});
