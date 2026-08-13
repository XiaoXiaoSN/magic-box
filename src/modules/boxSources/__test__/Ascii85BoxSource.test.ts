import { describe, expect, it } from 'vitest';
import { Ascii85BoxSource } from '../Ascii85BoxSource';

describe('Ascii85BoxSource', () => {
  describe('generateBoxes — no match', () => {
    it('returns [] when no option key is present', async () => {
      const boxes = await Ascii85BoxSource.generateBoxes('hello', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when input is empty string', async () => {
      const boxes = await Ascii85BoxSource.generateBoxes('', {
        ascii85: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when input is only whitespace', async () => {
      const boxes = await Ascii85BoxSource.generateBoxes('   ', {
        ascii85: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('encode — ::ascii85 / ::base85 / ::a85', () => {
    it('encodes "Man " → "9jqo^" (canonical Wikipedia example)', async () => {
      const boxes = await Ascii85BoxSource.generateBoxes('Man ', {
        ascii85: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Ascii85 (Encode)');
      expect(boxes[0].props.plaintextOutput).toBe('9jqo^');
    });

    it('accepts ::base85 as an alias', async () => {
      const boxes = await Ascii85BoxSource.generateBoxes('Man ', {
        base85: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('9jqo^');
    });

    it('accepts ::a85 as an alias', async () => {
      const boxes = await Ascii85BoxSource.generateBoxes('Man ', {
        a85: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('9jqo^');
    });

    it('encodes 4 null bytes using the "z" shortcut', async () => {
      const boxes = await Ascii85BoxSource.generateBoxes('\x00\x00\x00\x00', {
        ascii85: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('z');
    });

    it('round-trips "The quick brown fox"', async () => {
      const input = 'The quick brown fox';
      const encBoxes = await Ascii85BoxSource.generateBoxes(input, {
        ascii85: true,
      });
      const encoded = encBoxes[0].props.plaintextOutput;

      const decBoxes = await Ascii85BoxSource.generateBoxes(encoded, {
        ascii85decode: true,
      });
      expect(decBoxes[0].props.plaintextOutput).toBe(input);
    });

    it('round-trips unicode string "héllo 世界"', async () => {
      const input = 'héllo 世界';
      const encBoxes = await Ascii85BoxSource.generateBoxes(input, {
        ascii85: true,
      });
      const encoded = encBoxes[0].props.plaintextOutput;

      const decBoxes = await Ascii85BoxSource.generateBoxes(encoded, {
        ascii85decode: true,
      });
      expect(decBoxes[0].props.plaintextOutput).toBe(input);
    });

    it('round-trips "sure." (5-byte partial group)', async () => {
      const input = 'sure.';
      const encBoxes = await Ascii85BoxSource.generateBoxes(input, {
        ascii85: true,
      });
      const encoded = encBoxes[0].props.plaintextOutput;

      const decBoxes = await Ascii85BoxSource.generateBoxes(encoded, {
        ascii85decode: true,
      });
      expect(decBoxes[0].props.plaintextOutput).toBe(input);
    });
  });

  describe('decode — ::ascii85decode / ::a85decode', () => {
    it('decodes "9jqo^" → "Man "', async () => {
      const boxes = await Ascii85BoxSource.generateBoxes('9jqo^', {
        ascii85decode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Ascii85 (Decode)');
      expect(boxes[0].props.plaintextOutput).toBe('Man ');
    });

    it('accepts ::a85decode as an alias', async () => {
      const boxes = await Ascii85BoxSource.generateBoxes('9jqo^', {
        a85decode: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('Man ');
    });

    it('decodes "z" → 4 null bytes', async () => {
      const boxes = await Ascii85BoxSource.generateBoxes('z', {
        ascii85decode: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('\x00\x00\x00\x00');
    });

    it('returns an error box for invalid characters', async () => {
      // '~' is outside the valid '!'..'u' range
      const boxes = await Ascii85BoxSource.generateBoxes('v~', {
        ascii85decode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/^Error:/);
    });
  });

  describe('both encode and decode options', () => {
    it('returns 2 boxes when both ::ascii85 and ::ascii85decode are set', async () => {
      const boxes = await Ascii85BoxSource.generateBoxes('Man ', {
        ascii85: true,
        ascii85decode: true,
      });
      expect(boxes).toHaveLength(2);
      const names = boxes.map((b) => b.props.name);
      expect(names).toContain('Ascii85 (Encode)');
      expect(names).toContain('Ascii85 (Decode)');
    });
  });

  describe('metadata', () => {
    it('sets showExpandButton to false', async () => {
      const boxes = await Ascii85BoxSource.generateBoxes('Man ', {
        ascii85: true,
      });
      expect(boxes[0].props.showExpandButton).toBe(false);
    });

    it('sets priority from BoxSource.priority', async () => {
      const boxes = await Ascii85BoxSource.generateBoxes('Man ', {
        ascii85: true,
      });
      expect(boxes[0].props.priority).toBe(Ascii85BoxSource.priority);
    });
  });
});
