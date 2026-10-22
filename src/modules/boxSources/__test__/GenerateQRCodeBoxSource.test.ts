import { expect } from 'vitest';

import { GenerateQRCodeBoxSource } from '../GenerateQRCodeBoxSource';

describe('GenerateQRCodeBoxSource', () => {
  describe('checkMatch', () => {
    it('should return false without qr/qrcode option', () => {
      expect(GenerateQRCodeBoxSource.checkMatch('test', null)).toBe(false);
      expect(GenerateQRCodeBoxSource.checkMatch('test', {})).toBe(false);
      expect(GenerateQRCodeBoxSource.checkMatch('test', { meow: true })).toBe(
        false,
      );
    });

    it('should return false for empty input', () => {
      expect(GenerateQRCodeBoxSource.checkMatch('', { qr: true })).toBe(false);
    });

    it('should return true with qr/qrcode option', () => {
      expect(GenerateQRCodeBoxSource.checkMatch('test', { qr: true })).toBe(
        true,
      );
      expect(GenerateQRCodeBoxSource.checkMatch('test', { qrcode: true })).toBe(
        true,
      );
    });
  });

  describe('generateBoxes', () => {
    it('should return empty array for invalid input', async () => {
      const boxes = await GenerateQRCodeBoxSource.generateBoxes('', {});
      expect(boxes).toHaveLength(0);
    });

    it('should generate QRCode box for valid input with qr option', async () => {
      const input = 'https://example.com';
      const boxes = await GenerateQRCodeBoxSource.generateBoxes(input, {
        qr: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('QRCode');
      expect(boxes[0].props.plaintextOutput).toBe(input);
    });

    it('should generate QRCode box for valid input with qrcode option', async () => {
      const input = 'https://example.com';
      const boxes = await GenerateQRCodeBoxSource.generateBoxes(input, {
        qrcode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('QRCode');
      expect(boxes[0].props.plaintextOutput).toBe(input);
      expect(boxes[0].view).toBe('qrCode');
    });

    const byteLimitCases: Array<[string, string, boolean]> = [
      ['ASCII at the byte limit', 'a'.repeat(2953), false],
      ['ASCII over the byte limit', 'a'.repeat(2954), true],
      ['multibyte input at the byte limit', `${'中'.repeat(983)}abcd`, false],
      ['multibyte input over the byte limit', `${'中'.repeat(983)}abcde`, true],
    ];

    for (const [label, input, tooLong] of byteLimitCases) {
      it(label, async () => {
        const [box] = await GenerateQRCodeBoxSource.generateBoxes(input, {
          qr: true,
        });

        expect(box.props.name).toBe('QRCode');
        expect(box.props.plaintextOutput).toBe(
          tooLong ? 'Input too long for a QR code (max 2953 bytes)' : input,
        );
        expect(box.view).toBe(tooLong ? undefined : 'qrCode');
      });
    }
  });
});
