import { describe, expect, it } from 'vitest';

import { BifidBoxSource } from '../BifidBoxSource';

// all test vectors use the standard square ABCDEFGHIKLMNOPQRSTUVWXYZ (no J)
// note: the Wikipedia "FLEEATONCE → UAEOLWRINS" example uses the keyword square
// BGWKZQPNDSIOAXEFCLUMTHYVR — it does NOT apply to the standard alphabet square.
// with the standard square the correct encode of FLEEATONCE is HADNAAZDSP.
//
// trace for FLEEATONCE with standard square:
//   F(1,0) L(2,0) E(0,4) E(0,4) A(0,0) T(3,3) O(2,3) N(2,2) C(0,2) E(0,4)
//   R=[1,2,0,0,0,3,2,2,0,0]  C=[0,0,4,4,0,3,3,2,2,4]
//   combined=[1,2,0,0,0,3,2,2,0,0, 0,0,4,4,0,3,3,2,2,4]
//   pairs→ (1,2)H (0,0)A (0,3)D (2,2)N (0,0)A (0,0)A (4,4)Z (0,3)D (3,2)S (2,4)P
//   → HADNAAZDSP

describe('BifidBoxSource', () => {
  describe('option gating', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await BifidBoxSource.generateBoxes('FLEEATONCE', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when options is empty object', async () => {
      const boxes = await BifidBoxSource.generateBoxes('FLEEATONCE', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input with ::bifid', async () => {
      const boxes = await BifidBoxSource.generateBoxes('', { bifid: true });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for whitespace-only input', async () => {
      const boxes = await BifidBoxSource.generateBoxes('   ', { bifid: true });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for non-letter input (all digits/punctuation stripped to empty)', async () => {
      const boxes = await BifidBoxSource.generateBoxes('123!@#', {
        bifid: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('encode — ::bifid', () => {
    it('encodes FLEEATONCE to HADNAAZDSP with standard square', async () => {
      const boxes = await BifidBoxSource.generateBoxes('FLEEATONCE', {
        bifid: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Bifid Cipher (Encrypt)');
      expect(boxes[0].props.plaintextOutput).toBe('HADNAAZDSP');
    });

    it('::bifidencode is an alias for ::bifid', async () => {
      const boxes = await BifidBoxSource.generateBoxes('FLEEATONCE', {
        bifidencode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('HADNAAZDSP');
    });
  });

  describe('decode — ::bifiddecode', () => {
    it('decodes HADNAAZDSP back to FLEEATONCE', async () => {
      const boxes = await BifidBoxSource.generateBoxes('HADNAAZDSP', {
        bifiddecode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Bifid Cipher (Decrypt)');
      expect(boxes[0].props.plaintextOutput).toBe('FLEEATONCE');
    });
  });

  describe('J→I substitution (lossy)', () => {
    it('treats J as I before enciphering', async () => {
      // J is preprocessed to I, so JUMP → IUMP then enciphered
      const encBoxes = await BifidBoxSource.generateBoxes('JUMP', {
        bifid: true,
      });
      const iumpBoxes = await BifidBoxSource.generateBoxes('IUMP', {
        bifid: true,
      });
      expect(encBoxes[0].props.plaintextOutput).toBe(
        iumpBoxes[0].props.plaintextOutput,
      );
    });

    it('decode round-trip of JUMP recovers IUMP, not JUMP (J→I is lossy)', async () => {
      const enc = await BifidBoxSource.generateBoxes('JUMP', { bifid: true });
      const ciphertext = enc[0].props.plaintextOutput;
      const dec = await BifidBoxSource.generateBoxes(ciphertext, {
        bifiddecode: true,
      });
      // J became I permanently during preprocessing
      expect(dec[0].props.plaintextOutput).toBe('IUMP');
    });
  });

  describe('round-trip', () => {
    it('encode then decode recovers DEFENDTHEEAST from DEFENDTHEEAST', async () => {
      // input "DEFENDtheEAST" → letters only → DEFENDTHEEAST
      const enc = await BifidBoxSource.generateBoxes('DEFENDtheEAST', {
        bifid: true,
      });
      const ciphertext = enc[0].props.plaintextOutput;
      expect(ciphertext).toHaveLength(13); // DEFENDTHEEAST is 13 letters

      const dec = await BifidBoxSource.generateBoxes(ciphertext, {
        bifiddecode: true,
      });
      expect(dec[0].props.plaintextOutput).toBe('DEFENDTHEEAST');
    });

    it('spaces and punctuation are stripped before enciphering', async () => {
      // "DEFEND THE EAST" strips to same 12 letters as "DEFENDTHEEAST"
      const withSpaces = await BifidBoxSource.generateBoxes('DEFEND THE EAST', {
        bifid: true,
      });
      const withoutSpaces = await BifidBoxSource.generateBoxes(
        'DEFENDTHEEAST',
        {
          bifid: true,
        },
      );
      expect(withSpaces[0].props.plaintextOutput).toBe(
        withoutSpaces[0].props.plaintextOutput,
      );
    });
  });

  describe('both options → two boxes', () => {
    it('returns encode box and decode box when both ::bifid and ::bifiddecode are set', async () => {
      const boxes = await BifidBoxSource.generateBoxes('FLEEATONCE', {
        bifid: true,
        bifiddecode: true,
      });
      expect(boxes).toHaveLength(2);
      const names = boxes.map((b) => b.props.name);
      expect(names).toContain('Bifid Cipher (Encrypt)');
      expect(names).toContain('Bifid Cipher (Decrypt)');
    });
  });

  describe('box metadata', () => {
    it('showExpandButton is false', async () => {
      const boxes = await BifidBoxSource.generateBoxes('HELLO', {
        bifid: true,
      });
      expect(boxes[0].props.showExpandButton).toBe(false);
    });

    it('priority matches source priority', async () => {
      const boxes = await BifidBoxSource.generateBoxes('HELLO', {
        bifid: true,
      });
      expect(boxes[0].props.priority).toBe(BifidBoxSource.priority);
    });
  });

  describe('static metadata', () => {
    it('has expected name, tag, kind, priority', () => {
      expect(BifidBoxSource.name).toBe('Bifid Cipher');
      expect(BifidBoxSource.tag).toBe('#');
      expect(BifidBoxSource.kind).toBe('Encode');
      expect(typeof BifidBoxSource.priority).toBe('number');
    });
  });
});
