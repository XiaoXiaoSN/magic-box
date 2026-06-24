import { describe, expect, it } from 'vitest';

import { NoteFrequencyBoxSource } from '../NoteFrequencyBoxSource';

describe('NoteFrequencyBoxSource', () => {
  describe('generateBoxes', () => {
    it('should return [] when no option key is present', async () => {
      const boxes = await NoteFrequencyBoxSource.generateBoxes('A4', null);
      expect(boxes).toHaveLength(0);
    });

    it('should return [] when unrelated options are provided', async () => {
      const boxes = await NoteFrequencyBoxSource.generateBoxes('A4', {
        qrcode: true,
      });
      expect(boxes).toHaveLength(0);
    });

    describe('note name → frequency', () => {
      it('A4 → 440 Hz, MIDI 69', async () => {
        const boxes = await NoteFrequencyBoxSource.generateBoxes('A4', {
          note: true,
        });
        expect(boxes).toHaveLength(1);

        const opts = boxes[0].props.options as Record<string, string>;
        // frequency should be 440.00 Hz
        expect(opts.Frequency).toMatch(/^440/);
        expect(opts.MIDI).toBe('69');
      });

      it('C4 → ~261.63 Hz (middle C)', async () => {
        const boxes = await NoteFrequencyBoxSource.generateBoxes('C4', {
          note: true,
        });
        expect(boxes).toHaveLength(1);

        const opts = boxes[0].props.options as Record<string, string>;
        expect(opts.Frequency).toMatch(/^261\.6/);
        expect(opts.MIDI).toBe('60');
      });

      it('A5 → 880 Hz', async () => {
        const boxes = await NoteFrequencyBoxSource.generateBoxes('A5', {
          note: true,
        });
        const opts = boxes[0].props.options as Record<string, string>;
        expect(opts.Frequency).toMatch(/^880/);
      });

      it('A3 → 220 Hz', async () => {
        const boxes = await NoteFrequencyBoxSource.generateBoxes('A3', {
          note: true,
        });
        const opts = boxes[0].props.options as Record<string, string>;
        expect(opts.Frequency).toMatch(/^220/);
      });

      it('C#5 and Db5 produce the same frequency (~554.37 Hz)', async () => {
        const sharpBoxes = await NoteFrequencyBoxSource.generateBoxes('C#5', {
          note: true,
        });
        const flatBoxes = await NoteFrequencyBoxSource.generateBoxes('Db5', {
          note: true,
        });

        const sharpOpts = sharpBoxes[0].props.options as Record<string, string>;
        const flatOpts = flatBoxes[0].props.options as Record<string, string>;

        // both should start with 554.3
        expect(sharpOpts.Frequency).toMatch(/^554\.3/);
        expect(flatOpts.Frequency).toMatch(/^554\.3/);
        // same MIDI number
        expect(sharpOpts.MIDI).toBe(flatOpts.MIDI);
      });

      it('accepts ::pitch option', async () => {
        const boxes = await NoteFrequencyBoxSource.generateBoxes('A4', {
          pitch: true,
        });
        expect(boxes).toHaveLength(1);
        const opts = boxes[0].props.options as Record<string, string>;
        expect(opts.Frequency).toMatch(/^440/);
      });

      it('box name is "Musical Note"', async () => {
        const boxes = await NoteFrequencyBoxSource.generateBoxes('A4', {
          note: true,
        });
        expect(boxes[0].props.name).toBe('Musical Note');
      });

      it('plaintextOutput contains key:value pairs', async () => {
        const boxes = await NoteFrequencyBoxSource.generateBoxes('A4', {
          note: true,
        });
        expect(boxes[0].props.plaintextOutput).toContain('Frequency:');
        expect(boxes[0].props.plaintextOutput).toContain('MIDI:');
      });
    });

    describe('frequency (Hz) → nearest note', () => {
      it('440 Hz → Nearest Note A4, Cents 0', async () => {
        const boxes = await NoteFrequencyBoxSource.generateBoxes('440', {
          note: true,
        });
        expect(boxes).toHaveLength(1);

        const opts = boxes[0].props.options as Record<string, string>;
        expect(opts['Nearest Note']).toBe('A4');
        expect(opts.Cents).toBe('+0');
        expect(opts.MIDI).toBe('69');
      });

      it('261.63 Hz → Nearest Note C4', async () => {
        const boxes = await NoteFrequencyBoxSource.generateBoxes('261.63', {
          note: true,
        });
        const opts = boxes[0].props.options as Record<string, string>;
        expect(opts['Nearest Note']).toBe('C4');
      });

      it('450 Hz → Nearest Note A4, positive cents deviation', async () => {
        const boxes = await NoteFrequencyBoxSource.generateBoxes('450', {
          note: true,
        });
        const opts = boxes[0].props.options as Record<string, string>;
        expect(opts['Nearest Note']).toBe('A4');
        // 450 Hz is above 440 Hz so cents should be positive
        const cents = Number.parseInt(opts.Cents, 10);
        expect(cents).toBeGreaterThan(0);
        // approximately +39 cents
        expect(cents).toBeGreaterThanOrEqual(38);
        expect(cents).toBeLessThanOrEqual(40);
      });

      it('frequency result includes Note Frequency field', async () => {
        const boxes = await NoteFrequencyBoxSource.generateBoxes('440', {
          note: true,
        });
        const opts = boxes[0].props.options as Record<string, string>;
        expect(opts['Note Frequency']).toMatch(/^440/);
      });
    });

    describe('invalid / unrecognized input', () => {
      it('unrecognized text produces a help box', async () => {
        const boxes = await NoteFrequencyBoxSource.generateBoxes('hello', {
          note: true,
        });
        expect(boxes).toHaveLength(1);
        const opts = boxes[0].props.options as Record<string, string>;
        expect(opts.Format).toBeTruthy();
      });

      it('input longer than 32 chars returns []', async () => {
        const boxes = await NoteFrequencyBoxSource.generateBoxes(
          'A4 some very long extra text that exceeds',
          { note: true },
        );
        expect(boxes).toHaveLength(0);
      });
    });
  });
});
