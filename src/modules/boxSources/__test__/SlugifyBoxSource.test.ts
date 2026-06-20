import { SlugifyBoxSource } from '@modules/boxSources/SlugifyBoxSource';
import { describe, expect, it } from 'vitest';

describe('SlugifyBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when ::slug option is absent', async () => {
      const boxes = await SlugifyBoxSource.generateBoxes(
        'Héllo World! Foo_Bar',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input with ::slug option', async () => {
      const boxes = await SlugifyBoxSource.generateBoxes('', { slug: true });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for whitespace-only input', async () => {
      const boxes = await SlugifyBoxSource.generateBoxes('   ', { slug: true });
      expect(boxes).toHaveLength(0);
    });

    it('converts accented text with punctuation and underscores', async () => {
      const boxes = await SlugifyBoxSource.generateBoxes(
        'Héllo World! Foo_Bar',
        { slug: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('hello-world-foo-bar');
    });

    it('collapses special characters between words correctly', async () => {
      const boxes = await SlugifyBoxSource.generateBoxes('  C++  & Rust!! ', {
        slug: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('c-rust');
    });

    it('drops non-latin characters and collapses remaining segments', async () => {
      const boxes = await SlugifyBoxSource.generateBoxes('日本語 test', {
        slug: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('test');
    });

    it('returns [] when input reduces to empty after slugification', async () => {
      const boxes = await SlugifyBoxSource.generateBoxes('日本語!!!', {
        slug: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('produces no leading, trailing, or double hyphens', async () => {
      const boxes = await SlugifyBoxSource.generateBoxes('--Hello--World--', {
        slug: true,
      });
      expect(boxes).toHaveLength(1);
      const slug = boxes[0].props.plaintextOutput as string;
      expect(slug).not.toMatch(/^-|-$|--/);
      expect(slug).toBe('hello-world');
    });
  });
});
