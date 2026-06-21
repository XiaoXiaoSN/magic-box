import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { DammBoxSource } from '../DammBoxSource';

describe('DammBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when no trigger option is present', async () => {
      const boxes = await DammBoxSource.generateBoxes('572', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when options exist but no damm key', async () => {
      const boxes = await DammBoxSource.generateBoxes('572', { hash: true });
      expect(boxes).toHaveLength(0);
    });

    describe('check digit computation', () => {
      // canonical Wikipedia Damm example: 572 → check digit 4, so 5724 is Damm-valid
      it('572 produces check digit 4', async () => {
        const boxes = await DammBoxSource.generateBoxes('572', { damm: true });
        expect(boxes).toHaveLength(1);
        expect(boxes[0].props.options?.['Check Digit']).toBe('4');
        expect(boxes[0].props.options?.Valid).toBe('false');
        expect(boxes[0].props.options?.Input).toBe('572');
      });

      it('5724 is Damm-valid (interim reduces to 0)', async () => {
        const boxes = await DammBoxSource.generateBoxes('5724', { damm: true });
        expect(boxes).toHaveLength(1);
        expect(boxes[0].props.options?.Valid).toBe('true');
        expect(boxes[0].props.options?.['Check Digit']).toBe('0');
      });

      it('5720 is NOT Damm-valid (wrong check digit)', async () => {
        const boxes = await DammBoxSource.generateBoxes('5720', { damm: true });
        expect(boxes).toHaveLength(1);
        expect(boxes[0].props.options?.Valid).toBe('false');
      });
    });

    describe('single digit edge cases', () => {
      it('single digit 0: TABLE[0][0]=0 → check digit 0, valid true', async () => {
        const boxes = await DammBoxSource.generateBoxes('0', { damm: true });
        expect(boxes).toHaveLength(1);
        expect(boxes[0].props.options?.['Check Digit']).toBe('0');
        expect(boxes[0].props.options?.Valid).toBe('true');
      });

      it('single digit 5: TABLE[0][5]=9 → check digit 9, not valid', async () => {
        const boxes = await DammBoxSource.generateBoxes('5', { damm: true });
        expect(boxes).toHaveLength(1);
        expect(boxes[0].props.options?.['Check Digit']).toBe('9');
        expect(boxes[0].props.options?.Valid).toBe('false');
      });
    });

    describe('invalid input', () => {
      it('non-digit input returns a box explaining digits required', async () => {
        const boxes = await DammBoxSource.generateBoxes('abc', { damm: true });
        expect(boxes).toHaveLength(1);
        const errMsg = boxes[0].props.options?.Error as string;
        expect(errMsg).toBeTruthy();
        expect(errMsg.toLowerCase()).toContain('digit');
      });

      it('mixed alphanumeric input returns an error box', async () => {
        const boxes = await DammBoxSource.generateBoxes('12a3', { damm: true });
        expect(boxes).toHaveLength(1);
        expect(boxes[0].props.options?.Error).toBeTruthy();
      });
    });

    describe('template and priority', () => {
      it('uses KeyValueBoxTemplate', async () => {
        const boxes = await DammBoxSource.generateBoxes('572', { damm: true });
        expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
      });

      it('sets priority to 10', async () => {
        const boxes = await DammBoxSource.generateBoxes('572', { damm: true });
        expect(boxes[0].props.priority).toBe(10);
      });
    });

    describe('plaintext output', () => {
      it('contains k:v lines for Input, Valid, and Check Digit', async () => {
        const boxes = await DammBoxSource.generateBoxes('572', { damm: true });
        const output = boxes[0].props.plaintextOutput;
        expect(output).toContain('Input: 572');
        expect(output).toContain('Valid: false');
        expect(output).toContain('Check Digit: 4');
      });
    });
  });
});
