import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { PassphraseBoxSource, WORDLIST } from '../PassphraseBoxSource';

describe('PassphraseBoxSource', () => {
  describe('generateBoxes — trigger conditions', () => {
    it('returns [] when no option key is present', async () => {
      const boxes = await PassphraseBoxSource.generateBoxes('anything', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when unrelated option is present', async () => {
      const boxes = await PassphraseBoxSource.generateBoxes('anything', {
        qrcode: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('triggers with ::passphrase option', async () => {
      const boxes = await PassphraseBoxSource.generateBoxes('', {
        passphrase: true,
      });
      expect(boxes).toHaveLength(1);
    });

    it('triggers with ::diceware alias', async () => {
      const boxes = await PassphraseBoxSource.generateBoxes('', {
        diceware: true,
      });
      expect(boxes).toHaveLength(1);
    });
  });

  describe('generateBoxes — default word count (4)', () => {
    it('produces 4 words joined by hyphens', async () => {
      const boxes = await PassphraseBoxSource.generateBoxes('', {
        passphrase: true,
      });
      expect(boxes).toHaveLength(1);

      const box = boxes[0];
      expect(box.props.name).toBe('Passphrase');
      expect(box.props.priority).toBe(10);
      expect(box.boxTemplate).toBe(KeyValueBoxTemplate);

      const opts = box.props.options as Record<string, string>;
      const phrase = opts.Passphrase;
      const words = phrase.split('-');
      expect(words).toHaveLength(4);
      for (const word of words) {
        expect(WORDLIST).toContain(word);
      }
      expect(opts.Words).toBe('4');
    });
  });

  describe('generateBoxes — custom word count', () => {
    it('produces 6 words when ::passphrase=6', async () => {
      const boxes = await PassphraseBoxSource.generateBoxes('', {
        passphrase: '6',
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      const words = opts.Passphrase.split('-');
      expect(words).toHaveLength(6);
      expect(opts.Words).toBe('6');
    });

    it('clamps to 20 words when ::passphrase=99', async () => {
      const boxes = await PassphraseBoxSource.generateBoxes('', {
        passphrase: '99',
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      const words = opts.Passphrase.split('-');
      expect(words).toHaveLength(20);
      expect(opts.Words).toBe('20');
    });

    it('clamps to 2 words when ::passphrase=1', async () => {
      const boxes = await PassphraseBoxSource.generateBoxes('', {
        passphrase: '1',
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      const words = opts.Passphrase.split('-');
      expect(words).toHaveLength(2);
      expect(opts.Words).toBe('2');
    });
  });

  describe('generateBoxes — randomness', () => {
    it('two calls produce different passphrases (overwhelmingly likely)', async () => {
      const [a, b] = await Promise.all([
        PassphraseBoxSource.generateBoxes('', { passphrase: true }),
        PassphraseBoxSource.generateBoxes('', { passphrase: true }),
      ]);
      const phraseA = (a[0].props.options as Record<string, string>).Passphrase;
      const phraseB = (b[0].props.options as Record<string, string>).Passphrase;
      // probability of collision is (1/256)^4 ≈ 2e-10; treat as impossible
      expect(phraseA).not.toBe(phraseB);
    });
  });

  describe('generateBoxes — entropy', () => {
    it('entropy equals count * log2(wordlistSize) for 4 words', async () => {
      const boxes = await PassphraseBoxSource.generateBoxes('', {
        passphrase: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      const size = WORDLIST.length;
      const expected = (4 * Math.log2(size)).toFixed(1);
      expect(opts['Entropy (bits)']).toBe(expected);
      // for a 256-word list this is exactly '32.0'
      if (size === 256) {
        expect(opts['Entropy (bits)']).toBe('32.0');
      }
    });

    it('entropy scales with word count', async () => {
      const boxes = await PassphraseBoxSource.generateBoxes('', {
        passphrase: '6',
      });
      const opts = boxes[0].props.options as Record<string, string>;
      const size = WORDLIST.length;
      const expected = (6 * Math.log2(size)).toFixed(1);
      expect(opts['Entropy (bits)']).toBe(expected);
    });

    it('Wordlist Size reflects the actual WORDLIST length', async () => {
      const boxes = await PassphraseBoxSource.generateBoxes('', {
        passphrase: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Wordlist Size']).toBe(String(WORDLIST.length));
    });
  });

  describe('generateBoxes — all words from WORDLIST', () => {
    it('every word in the phrase belongs to WORDLIST', async () => {
      const boxes = await PassphraseBoxSource.generateBoxes('', {
        passphrase: '10',
      });
      const opts = boxes[0].props.options as Record<string, string>;
      for (const word of opts.Passphrase.split('-')) {
        expect(WORDLIST).toContain(word);
      }
    });
  });

  describe('generateBoxes — plaintext output', () => {
    it('plaintext contains key: value lines', async () => {
      const boxes = await PassphraseBoxSource.generateBoxes('', {
        passphrase: true,
      });
      const plaintext = boxes[0].props.plaintextOutput;
      expect(plaintext).toContain('Passphrase:');
      expect(plaintext).toContain('Words: 4');
      expect(plaintext).toContain('Entropy (bits):');
    });
  });

  describe('generateBoxes — secure-context fallback', () => {
    it('returns an error box when crypto.getRandomValues is unavailable', async () => {
      const original = globalThis.crypto;
      // @ts-expect-error — intentionally removing crypto to test the fallback
      delete globalThis.crypto;

      try {
        const boxes = await PassphraseBoxSource.generateBoxes('', {
          passphrase: true,
        });
        expect(boxes).toHaveLength(1);
        const opts = boxes[0].props.options as Record<string, string>;
        expect(opts.Error).toMatch(/secure context/i);
      } finally {
        globalThis.crypto = original;
      }
    });
  });

  describe('WORDLIST integrity', () => {
    it('has at least 256 entries', () => {
      expect(WORDLIST.length).toBeGreaterThanOrEqual(256);
    });

    it('has no duplicate words', () => {
      const unique = new Set(WORDLIST);
      expect(unique.size).toBe(WORDLIST.length);
    });

    it('all words are lowercase and non-empty', () => {
      for (const word of WORDLIST) {
        expect(word).toBe(word.toLowerCase());
        expect(word.length).toBeGreaterThan(0);
      }
    });
  });
});
