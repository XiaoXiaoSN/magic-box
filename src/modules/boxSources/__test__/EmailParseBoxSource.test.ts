import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { EmailParseBoxSource } from '../EmailParseBoxSource';

describe('EmailParseBoxSource', () => {
  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(EmailParseBoxSource.name).toBe('Email Parse');
      expect(EmailParseBoxSource.tag).toBe('#');
      expect(EmailParseBoxSource.kind).toBe('Analyze');
      expect(typeof EmailParseBoxSource.priority).toBe('number');
    });
  });

  describe('generateBoxes - option guard', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await EmailParseBoxSource.generateBoxes(
        'john.doe@example.com',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty options object', async () => {
      const boxes = await EmailParseBoxSource.generateBoxes(
        'john.doe@example.com',
        {},
      );
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - full address with plus-tag (::emailparse)', () => {
    it('parses john.doe+news@mail.example.co.uk correctly', async () => {
      const boxes = await EmailParseBoxSource.generateBoxes(
        'john.doe+news@mail.example.co.uk',
        { emailparse: true },
      );
      expect(boxes).toHaveLength(1);

      const { options } = boxes[0].props;
      expect(options?.Local).toBe('john.doe+news');
      expect(options?.Domain).toBe('mail.example.co.uk');
      expect(options?.TLD).toBe('uk');
      expect(options?.Tag).toBe('news');
      expect(options?.Valid).toBe('true');
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });
  });

  describe('generateBoxes - simple valid address', () => {
    it('parses a@b.com with no Tag key', async () => {
      const boxes = await EmailParseBoxSource.generateBoxes('a@b.com', {
        emailparse: true,
      });
      expect(boxes).toHaveLength(1);

      const { options } = boxes[0].props;
      expect(options?.Local).toBe('a');
      expect(options?.Domain).toBe('b.com');
      expect(options?.TLD).toBe('com');
      expect(options?.Valid).toBe('true');
      // no plus-tag in local part — Tag key must be absent
      expect(options).not.toHaveProperty('Tag');
    });
  });

  describe('generateBoxes - invalid address (no @)', () => {
    it('marks not-an-email as invalid', async () => {
      const boxes = await EmailParseBoxSource.generateBoxes('not-an-email', {
        emailparse: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Valid).toBe('false');
    });
  });

  describe('generateBoxes - invalid address (no dot in domain)', () => {
    it('marks a@b (domain without dot) as invalid', async () => {
      const boxes = await EmailParseBoxSource.generateBoxes('a@b', {
        emailparse: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Valid).toBe('false');
    });
  });

  describe('generateBoxes - ::email alias', () => {
    it('triggers on ::email option key', async () => {
      const boxes = await EmailParseBoxSource.generateBoxes('a@b.com', {
        email: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Valid).toBe('true');
    });
  });

  describe('generateBoxes - input length guard', () => {
    it('returns [] when input exceeds MAX_INPUT', async () => {
      const boxes = await EmailParseBoxSource.generateBoxes('a'.repeat(1001), {
        emailparse: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - plaintext output', () => {
    it('contains k:v lines matching options', async () => {
      const boxes = await EmailParseBoxSource.generateBoxes('a@b.com', {
        emailparse: true,
      });
      const { plaintextOutput } = boxes[0].props;
      expect(plaintextOutput).toContain('Local: a');
      expect(plaintextOutput).toContain('Domain: b.com');
      expect(plaintextOutput).toContain('TLD: com');
      expect(plaintextOutput).toContain('Valid: true');
    });
  });
});
