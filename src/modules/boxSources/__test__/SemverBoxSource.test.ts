import { expect } from 'vitest';

import { SemverBoxSource } from '../SemverBoxSource';

describe('SemverBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when ::semver option is absent', async () => {
      const boxes = await SemverBoxSource.generateBoxes('1.2.3');
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when options is null', async () => {
      const boxes = await SemverBoxSource.generateBoxes('1.2.3', null);
      expect(boxes).toHaveLength(0);
    });

    it('parses a basic semver string', async () => {
      const boxes = await SemverBoxSource.generateBoxes('1.2.3', {
        semver: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Major).toBe('1');
      expect(opts.Minor).toBe('2');
      expect(opts.Patch).toBe('3');
      expect(opts.Valid).toBe('true');
    });

    it('parses prerelease and build metadata', async () => {
      const boxes = await SemverBoxSource.generateBoxes(
        '1.2.3-beta.1+build.5',
        { semver: true },
      );
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Prerelease).toBe('beta.1');
      expect(opts.Build).toBe('build.5');
      expect(opts.Valid).toBe('true');
    });

    it('strips a leading v before parsing', async () => {
      const boxes = await SemverBoxSource.generateBoxes('v2.0.0', {
        semver: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Major).toBe('2');
      expect(opts.Valid).toBe('true');
    });

    it('returns an invalid box for a non-semver string', async () => {
      const boxes = await SemverBoxSource.generateBoxes('1.2', {
        semver: true,
      });
      expect(boxes).toHaveLength(1);
      const content = boxes[0].props.plaintextOutput;
      expect(content).toMatch(/not a valid semver/i);
    });

    it('rejects leading zeros in numeric identifiers', async () => {
      const boxes = await SemverBoxSource.generateBoxes('01.2.3', {
        semver: true,
      });
      expect(boxes).toHaveLength(1);
      const content = boxes[0].props.plaintextOutput;
      expect(content).toMatch(/not a valid semver/i);
    });
  });
});
