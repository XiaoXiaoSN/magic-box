import { HttpStatusBoxSource } from '@modules/boxSources/HttpStatusBoxSource';
import { describe, expect, it } from 'vitest';

type StringOptions = Record<string, string>;

function optionsFor(
  box: Awaited<ReturnType<typeof HttpStatusBoxSource.generateBoxes>>[number],
): StringOptions {
  return box.props.options as StringOptions;
}

describe('HttpStatusBoxSource', () => {
  it('does not match a bare three-digit number', async () => {
    expect(HttpStatusBoxSource.canHandle('502', null)).toBe(false);
    await expect(
      HttpStatusBoxSource.generateBoxes('502', null),
    ).resolves.toEqual([]);
  });

  it.each([
    'http 502',
    'status 404',
    'HTTP: 200',
  ])('matches explicit text form %s', async (input) => {
    expect(HttpStatusBoxSource.canHandle(input, null)).toBe(true);
    const [box] = await HttpStatusBoxSource.generateBoxes(input, null);
    expect(optionsFor(box).Code).toMatch(/^\d{3}$/);
  });

  it('shows an IANA status with cautious cache and retry guidance', async () => {
    const [box] = await HttpStatusBoxSource.generateBoxes('502', {
      http: true,
    });
    const options = optionsFor(box);
    expect(options).toMatchObject({
      Code: '502',
      Name: 'Bad Gateway',
      Category: '5xx Server Error',
      Reference: 'RFC 9110 §15.6.3',
    });
    expect(options.Caching).toContain('Not heuristically cacheable by default');
    expect(options.Retry).toContain('only safe or idempotent work');

    const [cacheable] = await HttpStatusBoxSource.generateBoxes('404', {
      http: true,
    });
    expect(optionsFor(cacheable).Caching).toContain(
      'Heuristically cacheable by default',
    );
    expect(optionsFor(cacheable).Caching).toContain('method still apply');
  });

  it('reverses normalized exact reason phrases and rejects partial/prototype names', async () => {
    const [notFound] = await HttpStatusBoxSource.generateBoxes('Not   Found', {
      http: true,
    });
    expect(optionsFor(notFound).Code).toBe('404');

    const [version] = await HttpStatusBoxSource.generateBoxes(
      'HTTP Version Not Supported',
      { http: true },
    );
    expect(optionsFor(version).Code).toBe('505');

    const [partial] = await HttpStatusBoxSource.generateBoxes(
      'not found maybe',
      { http: true },
    );
    expect(partial.props.plaintextOutput).toContain(
      'No exact IANA status phrase',
    );

    const [prototype] = await HttpStatusBoxSource.generateBoxes('constructor', {
      http: true,
    });
    expect(prototype.props.plaintextOutput).toContain(
      'No exact IANA status phrase',
    );
  });

  it('reports unassigned codes and ambiguous official names', async () => {
    const [unassigned] = await HttpStatusBoxSource.generateBoxes('419', {
      http: true,
    });
    expect(unassigned.props.plaintextOutput).toContain('not assigned');

    const [unused] = await HttpStatusBoxSource.generateBoxes('Unused', {
      http: true,
    });
    expect(unused.props.plaintextOutput).toContain(
      'more than one registered status (306, 418)',
    );
  });

  it('includes the current temporary 104 registration with its expiry', async () => {
    const [box] = await HttpStatusBoxSource.generateBoxes('104', {
      http: true,
    });
    expect(optionsFor(box).Name).toBe('Upload Resumption Supported');
    expect(optionsFor(box).Reference).toContain('temporary');
    expect(optionsFor(box).Description).toContain('expires 2026-11-13');
  });

  it('contains every currently registered IANA status code in the snapshot', async () => {
    const assigned = [
      100, 101, 102, 103, 104, 200, 201, 202, 203, 204, 205, 206, 207, 208, 226,
      300, 301, 302, 303, 304, 305, 306, 307, 308, 400, 401, 402, 403, 404, 405,
      406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 421, 422,
      423, 424, 425, 426, 428, 429, 431, 451, 500, 501, 502, 503, 504, 505, 506,
      507, 508, 510, 511,
    ];
    for (const code of assigned) {
      const [box] = await HttpStatusBoxSource.generateBoxes(String(code), {
        http: true,
      });
      expect(optionsFor(box).Code).toBe(String(code));
    }
  });

  it('bounds explicit body and option queries', async () => {
    const [body] = await HttpStatusBoxSource.generateBoxes('x'.repeat(257), {
      http: true,
    });
    expect(body.props.plaintextOutput).toContain('up to 256 characters');

    const [option] = await HttpStatusBoxSource.generateBoxes('', {
      http: 'x'.repeat(257),
    });
    expect(option.props.plaintextOutput).toContain('up to 256 characters');
  });
});
