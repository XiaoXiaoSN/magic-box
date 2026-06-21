import { describe, expect, it } from 'vitest';
import { CurlToFetchBoxSource } from '../CurlToFetchBoxSource';

describe('CurlToFetchBoxSource', () => {
  it('returns [] when option is absent', async () => {
    const boxes = await CurlToFetchBoxSource.generateBoxes(
      'curl https://api.example.com',
      null,
    );
    expect(boxes).toEqual([]);
  });

  it('returns [] when unrelated options are present', async () => {
    const boxes = await CurlToFetchBoxSource.generateBoxes(
      'curl https://api.example.com',
      { json: true },
    );
    expect(boxes).toEqual([]);
  });

  it('handles a plain GET with ::curl2fetch', async () => {
    const boxes = await CurlToFetchBoxSource.generateBoxes(
      'curl https://api.example.com',
      { curl2fetch: true },
    );
    expect(boxes).toHaveLength(1);
    const out = boxes[0].props.plaintextOutput;
    expect(out).toContain('fetch("https://api.example.com"');
    expect(out).toContain('method: "GET"');
  });

  it('handles a plain GET with ::curltofetch alias', async () => {
    const boxes = await CurlToFetchBoxSource.generateBoxes(
      'curl https://api.example.com',
      { curltofetch: true },
    );
    expect(boxes).toHaveLength(1);
    const out = boxes[0].props.plaintextOutput;
    expect(out).toContain('fetch("https://api.example.com"');
  });

  it('handles POST with method, header, and body', async () => {
    const boxes = await CurlToFetchBoxSource.generateBoxes(
      "curl -X POST https://x.com -H 'Content-Type: application/json' -d '{\"a\":1}'",
      { curl2fetch: true },
    );
    expect(boxes).toHaveLength(1);
    const out = boxes[0].props.plaintextOutput;
    expect(out).toContain('fetch("https://x.com"');
    expect(out).toContain('method: "POST"');
    expect(out).toContain('"Content-Type": "application/json"');
    expect(out).toContain('body:');
    // the body is emitted as a properly-escaped JS string literal
    expect(out).toContain(`body: ${JSON.stringify('{"a":1}')}`);
  });

  it('defaults to POST when -d is present but no -X', async () => {
    const boxes = await CurlToFetchBoxSource.generateBoxes(
      "curl https://x.com -d 'hi'",
      { curl2fetch: true },
    );
    expect(boxes).toHaveLength(1);
    const out = boxes[0].props.plaintextOutput;
    expect(out).toContain('method: "POST"');
  });

  it('returns an error box when no URL is found', async () => {
    const boxes = await CurlToFetchBoxSource.generateBoxes('curl -X GET', {
      curl2fetch: true,
    });
    expect(boxes).toHaveLength(1);
    const out = boxes[0].props.plaintextOutput;
    expect(out.toLowerCase()).toContain('url');
  });

  it('respects --request as an alias for -X', async () => {
    const boxes = await CurlToFetchBoxSource.generateBoxes(
      'curl --request DELETE https://x.com/1',
      { curl2fetch: true },
    );
    expect(boxes).toHaveLength(1);
    const out = boxes[0].props.plaintextOutput;
    expect(out).toContain('method: "DELETE"');
  });

  it('handles --header alias', async () => {
    const boxes = await CurlToFetchBoxSource.generateBoxes(
      "curl https://x.com --header 'Authorization: Bearer tok'",
      { curl2fetch: true },
    );
    expect(boxes).toHaveLength(1);
    const out = boxes[0].props.plaintextOutput;
    expect(out).toContain('"Authorization": "Bearer tok"');
  });

  it('skips known value-taking flags without misidentifying their value as URL', async () => {
    const boxes = await CurlToFetchBoxSource.generateBoxes(
      'curl -u user:pass https://secure.example.com',
      { curl2fetch: true },
    );
    expect(boxes).toHaveLength(1);
    const out = boxes[0].props.plaintextOutput;
    expect(out).toContain('fetch("https://secure.example.com"');
  });
});
