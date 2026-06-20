import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { EmailParseBoxSource } from '../EmailParseBoxSource';

describe('EmailParseBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when no trigger option is provided', async () => {
      const boxes = await EmailParseBoxSource.generateBoxes(
        'john.doe+news@mail.example.co.uk',
      );
      expect(boxes).toHaveLength(0);
    });

    it('parses john.doe+news@mail.example.co.uk into all parts including tag', async () => {
      const boxes = await EmailParseBoxSource.generateBoxes(
        'john.doe+news@mail.example.co.uk',
        { email: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Email Parse');
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Local).toBe('john.doe+news');
      expect(opts.Domain).toBe('mail.example.co.uk');
      expect(opts.TLD).toBe('uk');
      expect(opts.Tag).toBe('news');
    });

    it('parses a@b.com without a Tag key', async () => {
      const boxes = await EmailParseBoxSource.generateBoxes('a@b.com', {
        email: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Local).toBe('a');
      expect(opts.Domain).toBe('b.com');
      expect(opts.TLD).toBe('com');
      expect(opts).not.toHaveProperty('Tag');
    });

    it('sets the correct priority', async () => {
      const boxes = await EmailParseBoxSource.generateBoxes('a@b.com', {
        email: true,
      });
      expect(boxes[0].props.priority).toBe(10);
    });

    it('returns an error box for "not-an-email"', async () => {
      const boxes = await EmailParseBoxSource.generateBoxes('not-an-email', {
        email: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/valid/i);
    });

    it('returns an error box for "a@@b.com"', async () => {
      const boxes = await EmailParseBoxSource.generateBoxes('a@@b.com', {
        email: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/valid/i);
    });

    it('returns an error box for "a b@c.com" (space in local part)', async () => {
      const boxes = await EmailParseBoxSource.generateBoxes('a b@c.com', {
        email: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/valid/i);
    });
  });
});
