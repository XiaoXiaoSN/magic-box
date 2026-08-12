import { describe, expect, it } from 'vitest';
import { TextDiffBoxSource } from '../TextDiffBoxSource';

describe('TextDiffBoxSource', () => {
  it('returns [] when no matching option is provided', async () => {
    const boxes = await TextDiffBoxSource.generateBoxes(
      'foo\nbar\n---\nfoo\nbaz',
      null,
    );
    expect(boxes).toEqual([]);
  });

  it('returns [] for unrelated options', async () => {
    const boxes = await TextDiffBoxSource.generateBoxes(
      'foo\nbar\n---\nfoo\nbaz',
      { json: true },
    );
    expect(boxes).toEqual([]);
  });

  it('triggers on ::textdiff option', async () => {
    const boxes = await TextDiffBoxSource.generateBoxes(
      'foo\nbar\n---\nfoo\nbaz',
      { textdiff: true },
    );
    expect(boxes.length).toBe(1);
  });

  it('triggers on ::linediff option', async () => {
    const boxes = await TextDiffBoxSource.generateBoxes(
      'foo\nbar\n---\nfoo\nbaz',
      { linediff: true },
    );
    expect(boxes.length).toBe(1);
  });

  it('produces correct diff lines for foo/bar vs foo/baz', async () => {
    const boxes = await TextDiffBoxSource.generateBoxes(
      'foo\nbar\n---\nfoo\nbaz',
      { textdiff: true },
    );
    const output: string = boxes[0].props.plaintextOutput;
    expect(output).toContain('  foo');
    expect(output).toContain('- bar');
    expect(output).toContain('+ baz');
  });

  it('summary shows +1 -1 for foo/bar vs foo/baz', async () => {
    const boxes = await TextDiffBoxSource.generateBoxes(
      'foo\nbar\n---\nfoo\nbaz',
      { textdiff: true },
    );
    const output: string = boxes[0].props.plaintextOutput;
    expect(output).toMatch(/@@ \+1 -1 @@/);
  });

  it('identical texts produce no + or - lines and summary +0 -0', async () => {
    const boxes = await TextDiffBoxSource.generateBoxes('a\nb\n---\na\nb', {
      textdiff: true,
    });
    const output: string = boxes[0].props.plaintextOutput;
    const diffLines = output
      .split('\n')
      .filter((l) => l.startsWith('+ ') || l.startsWith('- '));
    expect(diffLines).toHaveLength(0);
    expect(output).toContain('@@ +0 -0 @@');
  });

  it('empty left side produces all added lines', async () => {
    const boxes = await TextDiffBoxSource.generateBoxes('\n---\nx', {
      textdiff: true,
    });
    const output: string = boxes[0].props.plaintextOutput;
    expect(output).toContain('+ x');
  });

  it('no separator returns a box mentioning --- separator', async () => {
    const boxes = await TextDiffBoxSource.generateBoxes('just one text', {
      textdiff: true,
    });
    expect(boxes.length).toBe(1);
    const output: string = boxes[0].props.plaintextOutput;
    expect(output).toContain('---');
  });

  it('returns [] for non-string input', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: intentional type coercion for test
    const boxes = await TextDiffBoxSource.generateBoxes(null as any, {
      textdiff: true,
    });
    expect(boxes).toEqual([]);
  });

  it('returns [] for input exceeding MAX_INPUT', async () => {
    const huge = 'a'.repeat(20_001);
    const boxes = await TextDiffBoxSource.generateBoxes(huge, {
      textdiff: true,
    });
    expect(boxes).toEqual([]);
  });

  it('refuses to diff more lines than the per-side cap (no LCS freeze)', async () => {
    // many short lines stays within MAX_INPUT but would be a huge LCS table
    const side = Array.from({ length: 2500 }, () => 'a').join('\n');
    const boxes = await TextDiffBoxSource.generateBoxes(
      `${side}\n---\n${side}`,
      {
        textdiff: true,
      },
    );
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.plaintextOutput.toLowerCase()).toContain(
      'too many lines',
    );
  });
});
