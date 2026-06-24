import { describe, expect, it } from 'vitest';

import { QuotedPrintableBoxSource } from '../QuotedPrintableBoxSource';

describe('QuotedPrintableBoxSource', () => {
  describe('no option / guard conditions', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await QuotedPrintableBoxSource.generateBoxes('Héllo', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await QuotedPrintableBoxSource.generateBoxes('Héllo', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty input with encode option', async () => {
      const boxes = await QuotedPrintableBoxSource.generateBoxes('', {
        quotedprintable: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for whitespace-only input', async () => {
      const boxes = await QuotedPrintableBoxSource.generateBoxes('   ', {
        quotedprintable: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('encode', () => {
    it('encodes Héllo → H=C3=A9llo (é = UTF-8 C3 A9)', async () => {
      const boxes = await QuotedPrintableBoxSource.generateBoxes('Héllo', {
        quotedprintable: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Quoted-Printable (Encode)');
      expect(boxes[0].props.plaintextOutput).toBe('H=C3=A9llo');
    });

    it('encodes = sign as =3D', async () => {
      const boxes = await QuotedPrintableBoxSource.generateBoxes('=', {
        quotedprintable: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('=3D');
    });

    it('leaves space literal in "a b"', async () => {
      const boxes = await QuotedPrintableBoxSource.generateBoxes('a b', {
        qp: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('a b');
    });

    it('accepts ::qpencode alias', async () => {
      const boxes = await QuotedPrintableBoxSource.generateBoxes('Hi', {
        qpencode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('Hi');
    });
  });

  describe('decode', () => {
    it('decodes H=C3=A9llo → Héllo', async () => {
      const boxes = await QuotedPrintableBoxSource.generateBoxes('H=C3=A9llo', {
        qpdecode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Quoted-Printable (Decode)');
      expect(boxes[0].props.plaintextOutput).toBe('Héllo');
    });

    it('removes soft line break =\\r\\n', async () => {
      const boxes = await QuotedPrintableBoxSource.generateBoxes(
        'abc=\r\ndef',
        { qpdecode: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('abcdef');
    });

    it('removes soft line break =\\n', async () => {
      const boxes = await QuotedPrintableBoxSource.generateBoxes('abc=\ndef', {
        qpdecode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('abcdef');
    });

    it('accepts ::quotedprintabledecode alias', async () => {
      const boxes = await QuotedPrintableBoxSource.generateBoxes('Hello', {
        quotedprintabledecode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('Hello');
    });
  });

  describe('round-trip', () => {
    it('encode then decode returns the original string', async () => {
      const original = 'Symbols: =, é, 日本! ✓';
      const encBoxes = await QuotedPrintableBoxSource.generateBoxes(original, {
        quotedprintable: true,
      });
      expect(encBoxes).toHaveLength(1);
      const encoded = encBoxes[0].props.plaintextOutput;

      const decBoxes = await QuotedPrintableBoxSource.generateBoxes(encoded, {
        qpdecode: true,
      });
      expect(decBoxes).toHaveLength(1);
      expect(decBoxes[0].props.plaintextOutput).toBe(original);
    });
  });

  describe('both options produce 2 boxes', () => {
    it('returns encode box and decode box when both options are set', async () => {
      const boxes = await QuotedPrintableBoxSource.generateBoxes('Hello', {
        quotedprintable: true,
        qpdecode: true,
      });
      expect(boxes).toHaveLength(2);
      const names = boxes.map((b) => b.props.name);
      expect(names).toContain('Quoted-Printable (Encode)');
      expect(names).toContain('Quoted-Printable (Decode)');
    });
  });

  describe('box template and metadata', () => {
    it('does not show expand button', async () => {
      const boxes = await QuotedPrintableBoxSource.generateBoxes('test', {
        quotedprintable: true,
      });
      expect(boxes[0].props.showExpandButton).toBe(false);
    });

    it('has expected static properties', () => {
      expect(QuotedPrintableBoxSource.name).toBe('Quoted-Printable');
      expect(QuotedPrintableBoxSource.tag).toBe('#');
      expect(QuotedPrintableBoxSource.kind).toBe('Encode');
      expect(typeof QuotedPrintableBoxSource.priority).toBe('number');
    });
  });
});
