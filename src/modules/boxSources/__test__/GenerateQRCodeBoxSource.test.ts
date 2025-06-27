import { expect } from 'vitest';

import { QRCodeBoxTemplate } from '@components/BoxTemplate';

import { GenerateQRCodeBoxSource } from '../GenerateQRCodeBoxSource';

describe('GenerateQRCodeBoxSource', () => {
  describe('checkMatch', () => {
    it('should return false without qr/qrcode option', () => {
      expect(GenerateQRCodeBoxSource.checkMatch('test', null)).toBe(false);
      expect(GenerateQRCodeBoxSource.checkMatch('test', {})).toBe(false);
      expect(GenerateQRCodeBoxSource.checkMatch('test', { meow: true })).toBe(false);
    });

    it('should return false for empty input', () => {
      expect(GenerateQRCodeBoxSource.checkMatch('', { qr: true })).toBe(false);
    });

    it('should return true with qr/qrcode option', () => {
      expect(GenerateQRCodeBoxSource.checkMatch('test', { qr: true })).toBe(true);
      expect(GenerateQRCodeBoxSource.checkMatch('test', { qrcode: true })).toBe(true);
    });
  });

  describe('generateBoxes', () => {
    it('should return empty array for invalid input', async () => {
      const boxes = await GenerateQRCodeBoxSource.generateBoxes('', {});
      expect(boxes).toHaveLength(0);
    });

    it('should generate QRCode box for valid input with qr option', async () => {
      const input = 'https://example.com';
      const boxes = await GenerateQRCodeBoxSource.generateBoxes(input, { qr: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('QRCode');
      expect(boxes[0].props.plaintextOutput).toBe(input);
      expect(boxes[0].props.priority).toBe(10); // PriorityGenerateQRCode value
    });

    it('should generate QRCode box for valid input with qrcode option', async () => {
      const input = 'https://example.com';
      const boxes = await GenerateQRCodeBoxSource.generateBoxes(input, { qrcode: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('QRCode');
      expect(boxes[0].props.plaintextOutput).toBe(input);
      expect(boxes[0].boxTemplate).toBe(QRCodeBoxTemplate);
    });
  });
});
