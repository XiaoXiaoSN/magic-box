import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';
import { ColumnarTranspositionBoxSource } from '../ColumnarTranspositionBoxSource';

const opts = (key: string, value: string | boolean = true) => ({
  [key]: value,
});

describe('ColumnarTranspositionBoxSource', () => {
  describe('no-match / guard conditions', () => {
    it('returns [] when no columnar option is present', async () => {
      expect(
        await ColumnarTranspositionBoxSource.generateBoxes('HELLO', null),
      ).toHaveLength(0);
    });

    it('returns [] when input is empty', async () => {
      expect(
        await ColumnarTranspositionBoxSource.generateBoxes(
          '',
          opts('columnar', 'KEY'),
        ),
      ).toHaveLength(0);
    });
  });

  describe('encrypt — ::columnar=KEY', () => {
    it('encrypts the canonical ZEBRAS vector', async () => {
      // Wikipedia columnar transposition example:
      // msg=WEAREDISCOVEREDFLEEATONCE (25 chars), key=ZEBRAS
      // expected ciphertext=EVLNACDTESEAROFODEECWIREE
      const boxes = await ColumnarTranspositionBoxSource.generateBoxes(
        'WEAREDISCOVEREDFLEEATONCE',
        opts('columnar', 'ZEBRAS'),
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Columnar Transposition (Encrypt)');
      expect(boxes[0].props.plaintextOutput).toBe('EVLNACDTESEAROFODEECWIREE');
    });

    it('strips whitespace from plaintext before encrypting', async () => {
      // "WE ARE DISCOVERED FLEE AT ONCE" with spaces stripped == WEAREDISCOVEREDFLEEATONCE
      const withSpaces = await ColumnarTranspositionBoxSource.generateBoxes(
        'WE ARE DISCOVERED FLEE AT ONCE',
        opts('columnar', 'ZEBRAS'),
      );
      const withoutSpaces = await ColumnarTranspositionBoxSource.generateBoxes(
        'WEAREDISCOVEREDFLEEATONCE',
        opts('columnar', 'ZEBRAS'),
      );
      expect(withSpaces[0].props.plaintextOutput).toBe(
        withoutSpaces[0].props.plaintextOutput,
      );
    });

    it('encrypts when msgLen is exactly divisible by keyLen', async () => {
      // WEAREDISCOVEREDFLEEATONCE is 25 chars; use ABCD (4) with a 24-char msg
      // HELLOWORLD123456789012 (22 chars) → not exact; use 20-char msg with key of len 4
      // HELLOWORLD1234567890 (20 chars), key=ABCD (4): 20%4=0, all cols have 5 rows
      // sorted ABCD: A(0),B(1),C(2),D(3) → read order [0,1,2,3]
      // grid: HELL / OWOR / LD12 / 3456 / 7890
      // col0: H,O,L,3,7  col1: E,W,D,4,8  col2: L,O,1,5,9  col3: L,R,2,6,0
      // read order [0,1,2,3]: HOL37 + EWD48 + LO159 + LR260
      const boxes = await ColumnarTranspositionBoxSource.generateBoxes(
        'HELLOWORLD1234567890',
        opts('columnar', 'ABCD'),
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('HOL37EWD48LO159LR260');
    });

    it('accepts ::columnarencode alias', async () => {
      const boxes = await ColumnarTranspositionBoxSource.generateBoxes(
        'HELLO',
        opts('columnarencode', 'KEY'),
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Columnar Transposition (Encrypt)');
    });
  });

  describe('decrypt — ::columnardecode=KEY', () => {
    it('decrypts the canonical ZEBRAS vector', async () => {
      const boxes = await ColumnarTranspositionBoxSource.generateBoxes(
        'EVLNACDTESEAROFODEECWIREE',
        opts('columnardecode', 'ZEBRAS'),
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Columnar Transposition (Decrypt)');
      expect(boxes[0].props.plaintextOutput).toBe('WEAREDISCOVEREDFLEEATONCE');
    });
  });

  describe('round-trips', () => {
    const roundTrip = async (text: string, key: string) => {
      const enc = await ColumnarTranspositionBoxSource.generateBoxes(
        text,
        opts('columnar', key),
      );
      const ciphertext = enc[0].props.plaintextOutput;
      const dec = await ColumnarTranspositionBoxSource.generateBoxes(
        ciphertext,
        opts('columnardecode', key),
      );
      return dec[0].props.plaintextOutput;
    };

    it('round-trips when msgLen is not divisible by keyLen', async () => {
      expect(await roundTrip('HELLOWORLD', 'KEY')).toBe('HELLOWORLD');
    });

    it('round-trips when msgLen is exactly divisible by keyLen', async () => {
      expect(await roundTrip('ATTACKATDAWN', 'KEY')).toBe('ATTACKATDAWN');
    });

    it('round-trips single-char key (identity)', async () => {
      expect(await roundTrip('HELLO', 'A')).toBe('HELLO');
    });

    it('round-trips key longer than message', async () => {
      expect(await roundTrip('HI', 'LONGKEY')).toBe('HI');
    });

    it('round-trips mixed-case input after whitespace strip', async () => {
      const enc = await ColumnarTranspositionBoxSource.generateBoxes(
        'Hello World',
        opts('columnar', 'KEY'),
      );
      const dec = await ColumnarTranspositionBoxSource.generateBoxes(
        enc[0].props.plaintextOutput,
        opts('columnardecode', 'KEY'),
      );
      // spaces are stripped before encryption, so plaintext recovered is spaceless
      expect(dec[0].props.plaintextOutput).toBe('HelloWorld');
    });

    it('round-trips ZEBRAS canonical vector', async () => {
      expect(await roundTrip('WEAREDISCOVEREDFLEEATONCE', 'ZEBRAS')).toBe(
        'WEAREDISCOVEREDFLEEATONCE',
      );
    });
  });

  describe('usage box', () => {
    it('returns usage box for bare ::columnar (boolean true)', async () => {
      const boxes = await ColumnarTranspositionBoxSource.generateBoxes(
        'HELLO',
        opts('columnar', true),
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Columnar Transposition (Usage)');
    });

    it('returns usage box for empty key string', async () => {
      const boxes = await ColumnarTranspositionBoxSource.generateBoxes(
        'HELLO',
        { columnar: '' },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Columnar Transposition (Usage)');
    });

    it('returns usage box for bare ::columnardecode (boolean true)', async () => {
      const boxes = await ColumnarTranspositionBoxSource.generateBoxes(
        'HELLO',
        opts('columnardecode', true),
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Columnar Transposition (Usage)');
    });
  });

  describe('both options present', () => {
    it('returns 2 boxes when both encrypt and decrypt options are present', async () => {
      const boxes = await ColumnarTranspositionBoxSource.generateBoxes(
        'HELLOWORLD',
        { columnar: 'KEY', columnardecode: 'KEY' },
      );
      expect(boxes).toHaveLength(2);
      expect(boxes[0].props.name).toBe('Columnar Transposition (Encrypt)');
      expect(boxes[1].props.name).toBe('Columnar Transposition (Decrypt)');
    });
  });

  describe('box properties', () => {
    it('uses DefaultBoxTemplate', async () => {
      const boxes = await ColumnarTranspositionBoxSource.generateBoxes(
        'HELLO',
        opts('columnar', 'KEY'),
      );
      expect(boxes[0].boxTemplate).toBe(DefaultBoxTemplate);
    });

    it('showExpandButton is false', async () => {
      const boxes = await ColumnarTranspositionBoxSource.generateBoxes(
        'HELLO',
        opts('columnar', 'KEY'),
      );
      expect(boxes[0].props.showExpandButton).toBe(false);
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(ColumnarTranspositionBoxSource.name).toBe(
        'Columnar Transposition',
      );
      expect(ColumnarTranspositionBoxSource.tag).toBe('#');
      expect(ColumnarTranspositionBoxSource.kind).toBe('Encode');
      expect(typeof ColumnarTranspositionBoxSource.priority).toBe('number');
    });
  });

  describe('whitespace-formatted ciphertext', () => {
    it('decrypts space-grouped ciphertext (strips whitespace like encrypt)', async () => {
      const boxes = await ColumnarTranspositionBoxSource.generateBoxes(
        'EVLN ACDT ESEA ROFO DEEC WIREE',
        { columnardecode: 'ZEBRAS' },
      );
      expect(boxes[0].props.plaintextOutput).toBe('WEAREDISCOVEREDFLEEATONCE');
    });
  });
});
