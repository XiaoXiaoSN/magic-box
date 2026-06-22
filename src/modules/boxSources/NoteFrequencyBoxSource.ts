import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// standard 12-TET pitch class mapping: C=0, C#/Db=1, ..., B=11
const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];

const PITCH_CLASS: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

// regex for a note name with optional accidental and octave
const NOTE_PATTERN = /^([A-Ga-g])(#|b)?(-?\d+)$/;

// regex for a bare numeric frequency (Hz)
const FREQ_PATTERN = /^\d+(\.\d+)?$/;

function noteToMidi(
  noteLetter: string,
  accidental: string | undefined,
  octave: number,
): number {
  const base = PITCH_CLASS[noteLetter.toUpperCase()];
  const shift = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
  // midi middle-C (C4) = 60; formula: (octave+1)*12 + pitchClass
  return (octave + 1) * 12 + base + shift;
}

function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

function midiToNoteName(midi: number): string {
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[pitchClass]}${octave}`;
}

// build a plaintext representation of key:value pairs for KeyValueBoxTemplate fallback
function kvToPlaintext(pairs: Record<string, string>): string {
  return Object.entries(pairs)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

export const NoteFrequencyBoxSource = {
  name: 'Musical Note',
  description:
    'Convert a musical note (e.g. A4) to its frequency in Hz, or a frequency to the nearest note (A4=440, 12-TET).',
  defaultInput: 'A4 ::note',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'note', 'pitch')) return [];

    const raw = trim(input);
    if (!raw || raw.length > 32) return [];

    // note name → frequency
    const noteMatch = NOTE_PATTERN.exec(raw);
    if (noteMatch) {
      const [, letter, accidental, octaveStr] = noteMatch;
      const octave = Number.parseInt(octaveStr, 10);
      const midi = noteToMidi(letter, accidental, octave);
      const freq = midiToFreq(midi);
      const freqStr = freq.toFixed(2);
      const noteName = midiToNoteName(midi);

      const pairs: Record<string, string> = {
        Note: noteName,
        Frequency: `${freqStr} Hz`,
        MIDI: String(midi),
      };

      return [
        new BoxBuilder('Musical Note', kvToPlaintext(pairs))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(pairs)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // frequency (Hz) → nearest note
    const freqMatch = FREQ_PATTERN.exec(raw);
    if (freqMatch) {
      const freq = Number.parseFloat(raw);
      if (freq <= 0) return [];

      const midiExact = 69 + 12 * Math.log2(freq / 440);
      const midi = Math.round(midiExact);
      const noteName = midiToNoteName(midi);
      const noteFreq = midiToFreq(midi);
      const cents = Math.round((midiExact - midi) * 100);
      const centsStr = cents >= 0 ? `+${cents}` : String(cents);

      const pairs: Record<string, string> = {
        Frequency: `${freq} Hz`,
        'Nearest Note': noteName,
        'Note Frequency': `${noteFreq.toFixed(2)} Hz`,
        Cents: centsStr,
        MIDI: String(midi),
      };

      return [
        new BoxBuilder('Musical Note', kvToPlaintext(pairs))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(pairs)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // unrecognized input — explain accepted formats
    const helpText =
      'Enter a note name (e.g. A4, C#5, Bb3) or a frequency in Hz (e.g. 440).';
    const pairs: Record<string, string> = {
      Format: helpText,
    };

    return [
      new BoxBuilder('Musical Note', kvToPlaintext(pairs))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(pairs)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default NoteFrequencyBoxSource;
