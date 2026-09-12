import { describe, expect, it } from 'vitest';

import { Base85BoxSource } from '../Base85BoxSource';

describe('Base85BoxSource', () => {
  describe('generateBoxes - no option', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await Base85BoxSource.generateBoxes('hello', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await Base85BoxSource.generateBoxes('hello', {});
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - invalid decode', () => {
    it('rejects a single-char group (invalid Ascii85 length)', async () => {
      const boxes = await Base85BoxSource.generateBoxes('A', {
        base85decode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/invalid/i);
    });
  });

  describe('generateBoxes - encode (::base85)', () => {
    it('returns one encode box for ::base85 option', async () => {
      const boxes = await Base85BoxSource.generateBoxes('hello', {
        base85: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Base85 (Encode)');
    });

    it('known vector: "Man " encodes to "9jqo^"', async () => {
      const boxes = await Base85BoxSource.generateBoxes('Man ', {
        base85: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('9jqo^');
    });

    it('all-zero group (4 NUL bytes) encodes to single "z"', async () => {
      const input = String.fromCharCode(0).repeat(4);
      const boxes = await Base85BoxSource.generateBoxes(input, {
        base85: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('z');
    });

    it('encodes "hello" to the correct Ascii85 string', async () => {
      const boxes = await Base85BoxSource.generateBoxes('hello', {
        base85: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('BOu!rDZ');
    });

    it('encodes "foobar" correctly', async () => {
      const boxes = await Base85BoxSource.generateBoxes('foobar', {
        base85: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('AoDTs@<)');
    });

    it('showExpandButton is false', async () => {
      const boxes = await Base85BoxSource.generateBoxes('hello', {
        base85: true,
      });
      expect(boxes[0].props.showExpandButton).toBe(false);
    });
  });

  describe('generateBoxes - encode aliases', () => {
    it('responds to ::ascii85 option', async () => {
      const boxes = await Base85BoxSource.generateBoxes('hello', {
        ascii85: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Base85 (Encode)');
    });

    it('responds to ::base85encode option', async () => {
      const boxes = await Base85BoxSource.generateBoxes('hello', {
        base85encode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Base85 (Encode)');
    });
  });

  describe('generateBoxes - decode (::base85decode)', () => {
    it('decodes "BOu!rDZ" back to "hello"', async () => {
      const boxes = await Base85BoxSource.generateBoxes('BOu!rDZ', {
        base85decode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Base85 (Decode)');
      expect(boxes[0].props.plaintextOutput).toBe('hello');
    });

    it('decodes "9jqo^" back to "Man "', async () => {
      const boxes = await Base85BoxSource.generateBoxes('9jqo^', {
        base85decode: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('Man ');
    });

    it('decodes z shorthand (single "z") back to 4 NUL bytes', async () => {
      const boxes = await Base85BoxSource.generateBoxes('z', {
        base85decode: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe(
        String.fromCharCode(0).repeat(4),
      );
    });

    it('invalid char "v" produces an invalid-input box', async () => {
      const boxes = await Base85BoxSource.generateBoxes('BOu!vDZ', {
        base85decode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Base85 (Decode)');
      expect(boxes[0].props.plaintextOutput).toMatch(/invalid/i);
    });

    it('invalid char "~" produces an invalid-input box', async () => {
      const boxes = await Base85BoxSource.generateBoxes('~invalid~', {
        base85decode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/invalid/i);
    });
  });

  describe('generateBoxes - round-trip', () => {
    it('decode(encode("hello")) === "hello"', async () => {
      const encoded = (
        await Base85BoxSource.generateBoxes('hello', { base85: true })
      )[0].props.plaintextOutput;
      const decoded = (
        await Base85BoxSource.generateBoxes(encoded, { base85decode: true })
      )[0].props.plaintextOutput;
      expect(decoded).toBe('hello');
    });

    it('decode(encode("foobar")) === "foobar"', async () => {
      const encoded = (
        await Base85BoxSource.generateBoxes('foobar', { base85: true })
      )[0].props.plaintextOutput;
      const decoded = (
        await Base85BoxSource.generateBoxes(encoded, { base85decode: true })
      )[0].props.plaintextOutput;
      expect(decoded).toBe('foobar');
    });
  });

  describe('generateBoxes - both options together', () => {
    it('returns 2 boxes when both base85 and base85decode are set', async () => {
      // encode "hello" first, then pass encoded as input with both options
      const encoded = 'BOu!rDZ'; // known encoding of "hello"
      const boxes = await Base85BoxSource.generateBoxes(encoded, {
        base85: true,
        base85decode: true,
      });
      expect(boxes).toHaveLength(2);
      const names = boxes.map((b) => b.props.name);
      expect(names).toContain('Base85 (Encode)');
      expect(names).toContain('Base85 (Decode)');
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(Base85BoxSource.name).toBe('Base85');
      expect(Base85BoxSource.tag).toBe('#');
      expect(Base85BoxSource.kind).toBe('Encode');
      expect(typeof Base85BoxSource.priority).toBe('number');
    });
  });
});
