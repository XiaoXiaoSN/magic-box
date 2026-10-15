import { describe, expect, it } from 'vitest';

import { MorseCodeBoxSource } from '../MorseCodeBoxSource';

describe('MorseCodeBoxSource', () => {
  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(MorseCodeBoxSource.name).toBe('Morse Code');
      expect(MorseCodeBoxSource.tag).toBe('·');
      expect(MorseCodeBoxSource.kind).toBe('Encode');
    });
  });

  describe('generateBoxes - no option', () => {
    it('returns empty array when options are null', async () => {
      const boxes = await MorseCodeBoxSource.generateBoxes('SOS', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await MorseCodeBoxSource.generateBoxes('SOS', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for unrelated option keys', async () => {
      const boxes = await MorseCodeBoxSource.generateBoxes('SOS', {
        sha256: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - encode via ::morse', () => {
    it('SOS encodes to ... --- ...', async () => {
      const boxes = await MorseCodeBoxSource.generateBoxes('SOS', {
        morse: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Morse Code (Encode)');
      expect(boxes[0].props.plaintextOutput).toBe('... --- ...');
      expect(boxes[0].view).toBe('default');
      expect(boxes[0].props.showExpandButton).toBe(false);
    });

    it('HELLO WORLD encodes correctly with word separator', async () => {
      const boxes = await MorseCodeBoxSource.generateBoxes('HELLO WORLD', {
        morse: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe(
        '.... . .-.. .-.. --- / .-- --- .-. .-.. -..',
      );
    });

    it('lowercase input is treated as uppercase', async () => {
      const boxes = await MorseCodeBoxSource.generateBoxes('sos', {
        morse: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('... --- ...');
    });

    it('marks unknown characters instead of dropping them', async () => {
      const boxes = await MorseCodeBoxSource.generateBoxes('A~B', {
        morse: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('.- ..--.. -...');
    });

    it('normalizes accented letters before encoding', async () => {
      const boxes = await MorseCodeBoxSource.generateBoxes('héllo wörld', {
        morse: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe(
        '.... . .-.. .-.. --- / .-- --- .-. .-.. -..',
      );
    });
  });

  describe('generateBoxes - encode via ::morseencode', () => {
    it('morseencode option also triggers encode box', async () => {
      const boxes = await MorseCodeBoxSource.generateBoxes('SOS', {
        morseencode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Morse Code (Encode)');
      expect(boxes[0].props.plaintextOutput).toBe('... --- ...');
    });
  });

  describe('generateBoxes - decode via ::morsedecode', () => {
    it('decodes ... --- ... back to SOS', async () => {
      const boxes = await MorseCodeBoxSource.generateBoxes('... --- ...', {
        morsedecode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Morse Code (Decode)');
      expect(boxes[0].props.plaintextOutput).toBe('SOS');
      expect(boxes[0].view).toBe('default');
      expect(boxes[0].props.showExpandButton).toBe(false);
    });

    it('decodes HELLO WORLD Morse string correctly', async () => {
      const boxes = await MorseCodeBoxSource.generateBoxes(
        '.... . .-.. .-.. --- / .-- --- .-. .-.. -..',
        { morsedecode: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('HELLO WORLD');
    });

    it('normalizes typographic marks and slash/newline word boundaries', async () => {
      const boxes = await MorseCodeBoxSource.generateBoxes('… −−− …\n.-', {
        morsedecode: true,
      });
      const slash = await MorseCodeBoxSource.generateBoxes('... --- .../.-', {
        morsedecode: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('SOS A');
      expect(slash[0].props.plaintextOutput).toBe('SOS A');
    });

    it('marks unknown Morse symbols with ?', async () => {
      // '....' is H, '.....' is 5, '......' is unknown
      const boxes = await MorseCodeBoxSource.generateBoxes('.... ......', {
        morsedecode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('H?');
    });

    it('does not resolve inherited property names as Morse symbols', async () => {
      const boxes = await MorseCodeBoxSource.generateBoxes(
        'constructor toString __proto__',
        { morsedecode: true },
      );
      expect(boxes[0].props.plaintextOutput).toBe('???');
    });
  });

  describe('generateBoxes - both encode and decode options together', () => {
    it('returns two boxes when both morse and morsedecode are set', async () => {
      const boxes = await MorseCodeBoxSource.generateBoxes('SOS', {
        morse: true,
        morsedecode: true,
      });
      expect(boxes).toHaveLength(2);
      const names = boxes.map((b) => b.props.name);
      expect(names).toContain('Morse Code (Encode)');
      expect(names).toContain('Morse Code (Decode)');
    });
  });

  describe('generateBoxes - roundtrip', () => {
    it('encode then decode returns the original uppercased text', async () => {
      const original = 'MAGIC BOX';
      const [encodeBox] = await MorseCodeBoxSource.generateBoxes(original, {
        morse: true,
      });
      const [decodeBox] = await MorseCodeBoxSource.generateBoxes(
        encodeBox.props.plaintextOutput,
        { morsedecode: true },
      );
      expect(decodeBox.props.plaintextOutput).toBe(original);
    });
  });
});
