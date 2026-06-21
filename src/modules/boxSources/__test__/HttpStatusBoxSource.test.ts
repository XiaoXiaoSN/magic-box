import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { HttpStatusBoxSource } from '../HttpStatusBoxSource';

describe('HttpStatusBoxSource', () => {
  describe('generateBoxes', () => {
    it('should return [] when no httpstatus/httpcode option is present', async () => {
      const boxes = await HttpStatusBoxSource.generateBoxes('404');
      expect(boxes).toHaveLength(0);
    });

    it('should return [] when options is null', async () => {
      const boxes = await HttpStatusBoxSource.generateBoxes('404', null);
      expect(boxes).toHaveLength(0);
    });

    it('should look up 404 from input with ::httpstatus option', async () => {
      const boxes = await HttpStatusBoxSource.generateBoxes('404', {
        httpstatus: true,
      });
      expect(boxes).toHaveLength(1);
      const { options } = boxes[0].props;
      expect(options?.Code).toBe('404');
      expect(options?.Name).toBe('Not Found');
      expect(options?.Category).toBe('Client Error');
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('should prefer ::httpstatus=500 option value over input', async () => {
      const boxes = await HttpStatusBoxSource.generateBoxes('', {
        httpstatus: '500',
      });
      expect(boxes).toHaveLength(1);
      const { options } = boxes[0].props;
      expect(options?.Code).toBe('500');
      expect(options?.Name).toBe('Internal Server Error');
      expect(options?.Category).toBe('Server Error');
    });

    it('should look up 200 OK', async () => {
      const boxes = await HttpStatusBoxSource.generateBoxes('200', {
        httpstatus: true,
      });
      expect(boxes).toHaveLength(1);
      const { options } = boxes[0].props;
      expect(options?.Name).toBe('OK');
      expect(options?.Category).toBe('Success');
    });

    it('should look up 301 Moved Permanently', async () => {
      const boxes = await HttpStatusBoxSource.generateBoxes('301', {
        httpstatus: true,
      });
      expect(boxes).toHaveLength(1);
      const { options } = boxes[0].props;
      expect(options?.Name).toBe('Moved Permanently');
      expect(options?.Category).toBe('Redirection');
    });

    it("should look up 418 I'm a Teapot", async () => {
      const boxes = await HttpStatusBoxSource.generateBoxes('418', {
        httpcode: true,
      });
      expect(boxes).toHaveLength(1);
      const { options } = boxes[0].props;
      expect(options?.Name).toMatch(/teapot/i);
      expect(options?.Category).toBe('Client Error');
    });

    it('should handle valid-but-unassigned code 299 as Unknown', async () => {
      const boxes = await HttpStatusBoxSource.generateBoxes('299', {
        httpstatus: true,
      });
      expect(boxes).toHaveLength(1);
      const { options } = boxes[0].props;
      expect(options?.Category).toBe('Success');
      expect(options?.Name).toMatch(/unknown|unassigned/i);
    });

    it('should return an error box for invalid code 999 (out of 1xx-5xx range)', async () => {
      const boxes = await HttpStatusBoxSource.generateBoxes('999', {
        httpstatus: true,
      });
      expect(boxes).toHaveLength(1);
      const { options } = boxes[0].props;
      expect(options?.Code).toBe('999');
      // should mention the valid range, not resolve as a real status
      expect(options?.Name).toBeUndefined();
      expect(options?.Info).toBeTruthy();
    });

    it('should return an error box for non-numeric input "abc"', async () => {
      const boxes = await HttpStatusBoxSource.generateBoxes('abc', {
        httpstatus: true,
      });
      expect(boxes).toHaveLength(1);
      const { options } = boxes[0].props;
      expect(options?.Code).toBe('abc');
      expect(options?.Info).toBeTruthy();
    });

    it('should use ::httpcode option key as an alias', async () => {
      const boxes = await HttpStatusBoxSource.generateBoxes('200', {
        httpcode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Name).toBe('OK');
    });

    it('should include k: v plaintext lines in plaintextOutput for headless TUI', async () => {
      const boxes = await HttpStatusBoxSource.generateBoxes('404', {
        httpstatus: true,
      });
      expect(boxes).toHaveLength(1);
      const { plaintextOutput } = boxes[0].props;
      expect(plaintextOutput).toContain('Code: 404');
      expect(plaintextOutput).toContain('Name: Not Found');
      expect(plaintextOutput).toContain('Category: Client Error');
    });

    it('should set priority from source priority', async () => {
      const boxes = await HttpStatusBoxSource.generateBoxes('200', {
        httpstatus: true,
      });
      expect(boxes[0].props.priority).toBe(HttpStatusBoxSource.priority);
    });
  });
});
