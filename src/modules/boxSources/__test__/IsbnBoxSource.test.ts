import { describe, expect, it } from 'vitest';
import { IsbnBoxSource } from '../IsbnBoxSource';

describe('IsbnBoxSource', () => {
  it('returns [] when ::isbn option is absent', async () => {
    const boxes = await IsbnBoxSource.generateBoxes('9780306406157', null);
    expect(boxes).toHaveLength(0);
  });

  it('returns [] when option object exists but isbn key is missing', async () => {
    const boxes = await IsbnBoxSource.generateBoxes('9780306406157', {
      foo: true,
    });
    expect(boxes).toHaveLength(0);
  });

  it('returns [] for input with wrong length after cleaning', async () => {
    const boxes = await IsbnBoxSource.generateBoxes('12345', { isbn: true });
    expect(boxes).toHaveLength(0);
  });

  it('validates ISBN-13: 978-0-306-40615-7 → valid', async () => {
    const boxes = await IsbnBoxSource.generateBoxes('978-0-306-40615-7', {
      isbn: true,
    });
    expect(boxes).toHaveLength(1);
    const kv = boxes[0].props.options as Record<string, string>;
    expect(kv.Type).toBe('ISBN-13');
    expect(kv.Valid).toBe('true');
    expect(kv['Check Digit']).toBe('7');
    expect(kv.ISBN).toBe('9780306406157');
  });

  it('validates ISBN-13 with no separators: 9780306406157 → valid', async () => {
    const boxes = await IsbnBoxSource.generateBoxes('9780306406157', {
      isbn: true,
    });
    expect(boxes).toHaveLength(1);
    const kv = boxes[0].props.options as Record<string, string>;
    expect(kv.Type).toBe('ISBN-13');
    expect(kv.Valid).toBe('true');
  });

  it('validates ISBN-10 with hyphens: 0-306-40615-2 → valid', async () => {
    const boxes = await IsbnBoxSource.generateBoxes('0-306-40615-2', {
      isbn: true,
    });
    expect(boxes).toHaveLength(1);
    const kv = boxes[0].props.options as Record<string, string>;
    expect(kv.Type).toBe('ISBN-10');
    expect(kv.Valid).toBe('true');
    expect(kv['Check Digit']).toBe('2');
    expect(kv.ISBN).toBe('0306406152');
  });

  it('validates ISBN-10 without separators: 0306406152 → valid', async () => {
    const boxes = await IsbnBoxSource.generateBoxes('0306406152', {
      isbn: true,
    });
    expect(boxes).toHaveLength(1);
    const kv = boxes[0].props.options as Record<string, string>;
    expect(kv.Type).toBe('ISBN-10');
    expect(kv.Valid).toBe('true');
  });

  it('validates ISBN-10 with X check digit: 080442957X → valid', async () => {
    const boxes = await IsbnBoxSource.generateBoxes('080442957X', {
      isbn: true,
    });
    expect(boxes).toHaveLength(1);
    const kv = boxes[0].props.options as Record<string, string>;
    expect(kv.Type).toBe('ISBN-10');
    expect(kv.Valid).toBe('true');
    expect(kv['Check Digit']).toBe('X');
  });

  it('flags invalid check digit: 978-0-306-40615-0 → Valid false', async () => {
    const boxes = await IsbnBoxSource.generateBoxes('978-0-306-40615-0', {
      isbn: true,
    });
    expect(boxes).toHaveLength(1);
    const kv = boxes[0].props.options as Record<string, string>;
    expect(kv.Type).toBe('ISBN-13');
    expect(kv.Valid).toBe('false');
    // expected check digit is still 7, even though provided digit is 0
    expect(kv['Check Digit']).toBe('7');
  });
});
