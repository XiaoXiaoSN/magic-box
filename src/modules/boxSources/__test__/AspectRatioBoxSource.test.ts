import { describe, expect, it } from 'vitest';
import { AspectRatioBoxSource } from '../AspectRatioBoxSource';

describe('AspectRatioBoxSource', () => {
  describe('option gating', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await AspectRatioBoxSource.generateBoxes('1920x1080', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when unrelated options are provided', async () => {
      const boxes = await AspectRatioBoxSource.generateBoxes('1920x1080', {
        qrcode: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('happy path — ::ratio trigger', () => {
    it('simplifies 1920x1080 to 16:9', async () => {
      const boxes = await AspectRatioBoxSource.generateBoxes('1920x1080', {
        ratio: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({ Ratio: '16:9' });
    });

    it('accepts colon separator (1280:720) and gives 16:9', async () => {
      const boxes = await AspectRatioBoxSource.generateBoxes('1280:720', {
        ratio: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({ Ratio: '16:9' });
    });

    it('simplifies 1024x768 to 4:3', async () => {
      const boxes = await AspectRatioBoxSource.generateBoxes('1024x768', {
        ratio: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({ Ratio: '4:3' });
    });

    it('simplifies 500x500 to 1:1', async () => {
      const boxes = await AspectRatioBoxSource.generateBoxes('500x500', {
        ratio: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({ Ratio: '1:1' });
    });

    it('preserves exact precision for large dimensions', async () => {
      const boxes = await AspectRatioBoxSource.generateBoxes(
        '90071992547409930x90071992547409920',
        { ratio: true },
      );
      expect(boxes[0].props.options).toMatchObject({
        Ratio: '9007199254740993:9007199254740992',
      });
    });

    it('formats equivalent scaled dimensions identically without zeroing tiny ratios', async () => {
      const small = await AspectRatioBoxSource.generateBoxes('1x2000001', {
        ratio: true,
      });
      const scaled = await AspectRatioBoxSource.generateBoxes(
        '10000000000000000x20000010000000000000000',
        { ratio: true },
      );
      const smallDecimal = (small[0].props.options as Record<string, string>)
        .Decimal;
      const scaledDecimal = (scaled[0].props.options as Record<string, string>)
        .Decimal;
      expect(smallDecimal).toBe(scaledDecimal);
      expect(smallDecimal).not.toBe('0');
    });

    it('returns an error box before parsing dimensions above the digit limit', async () => {
      const boxes = await AspectRatioBoxSource.generateBoxes(
        `${'1'.repeat(129)}x5`,
        { ratio: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/too large/i);
    });
  });

  describe('happy path — ::aspect trigger', () => {
    it('also triggers on ::aspect option', async () => {
      const boxes = await AspectRatioBoxSource.generateBoxes('1920x1080', {
        aspect: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({ Ratio: '16:9' });
    });
  });

  describe('common name', () => {
    it('includes Common name for 16:9', async () => {
      const boxes = await AspectRatioBoxSource.generateBoxes('1920x1080', {
        ratio: true,
      });
      expect(boxes[0].props.options).toMatchObject({
        Common: '16:9 Widescreen',
      });
    });

    it('uses simplified keys for common ratios', async () => {
      const boxes = await AspectRatioBoxSource.generateBoxes('1920x1200', {
        ratio: true,
      });
      expect(boxes[0].props.options).toMatchObject({
        Ratio: '8:5',
        Common: '16:10 Widescreen',
      });
    });

    it('marks near ultrawide dimensions as approximate', async () => {
      const boxes = await AspectRatioBoxSource.generateBoxes('2560x1080', {
        ratio: true,
      });
      expect(boxes[0].props.options).toMatchObject({
        Ratio: '64:27',
        Common: '≈21:9 Ultrawide',
      });
    });

    it('omits Common key for non-standard ratios', async () => {
      const boxes = await AspectRatioBoxSource.generateBoxes('700x200', {
        ratio: true,
      });
      expect(boxes[0].props.options).toMatchObject({ Ratio: '7:2' });
      expect(boxes[0].props.options).not.toHaveProperty('Common');
    });
  });

  describe('invalid input', () => {
    it('returns [] for non-numeric input', async () => {
      const boxes = await AspectRatioBoxSource.generateBoxes('abc', {
        ratio: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when height is zero (1920x0)', async () => {
      const boxes = await AspectRatioBoxSource.generateBoxes('1920x0', {
        ratio: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when width is zero (0x1080)', async () => {
      const boxes = await AspectRatioBoxSource.generateBoxes('0x1080', {
        ratio: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input', async () => {
      const boxes = await AspectRatioBoxSource.generateBoxes('', {
        ratio: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('box structure', () => {
    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await AspectRatioBoxSource.generateBoxes('1920x1080', {
        ratio: true,
      });
      expect(boxes[0].view).toBe('keyValue');
    });

    it('sets priority from source constant', async () => {
      const boxes = await AspectRatioBoxSource.generateBoxes('1920x1080', {
        ratio: true,
      });
      expect(boxes[0].props.priority).toBe(AspectRatioBoxSource.priority);
    });

    it('sets box name to Aspect Ratio', async () => {
      const boxes = await AspectRatioBoxSource.generateBoxes('1920x1080', {
        ratio: true,
      });
      expect(boxes[0].props.name).toBe('Aspect Ratio');
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(AspectRatioBoxSource.name).toBe('Aspect Ratio');
      expect(AspectRatioBoxSource.tag).toBe('#');
      expect(AspectRatioBoxSource.kind).toBe('Convert');
    });
  });
});
