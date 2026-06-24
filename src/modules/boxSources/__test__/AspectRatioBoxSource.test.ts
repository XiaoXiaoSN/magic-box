import { KeyValueBoxTemplate } from '@components/BoxTemplate';
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

    it('omits Common key for non-standard ratios', async () => {
      // 700x300 simplifies to 7:3, which is not in the common-ratio table
      const boxes = await AspectRatioBoxSource.generateBoxes('700x300', {
        ratio: true,
      });
      expect(boxes[0].props.options).toMatchObject({ Ratio: '7:3' });
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
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
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
