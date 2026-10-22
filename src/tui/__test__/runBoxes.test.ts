// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { runBoxes, runTerminalSources } from '../runBoxes';
import { tuiBoxSources } from '../sources';

// proves the headless generation path: the TUI source list runs and produces
// `plaintextOutput` with no react/mui template attached. if any node-safe source
// pulled in a react template, importing this module (and thus `../sources`) would
// drag mui into the node graph; the suite running at all is part of the proof.
describe('headless box generation', () => {
  it('generates a UUID box with no react template attached', async () => {
    const boxes = await runBoxes('uuid');
    const uuid = boxes.find((box) => box.props.name === 'UUID');
    expect(uuid).toBeDefined();
    expect(uuid?.props.plaintextOutput).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    // headless boxes carry no template; the web layer supplies the default.
    expect(uuid?.boxTemplate).toBeUndefined();
  });

  it('parses `::option` directives shared with the web parser', async () => {
    const boxes = await runBoxes('uuid\n::uppercase');
    const uuid = boxes.find((box) => box.props.name === 'UUID');
    expect(uuid?.props.plaintextOutput).toBe(
      uuid?.props.plaintextOutput.toUpperCase(),
    );
  });

  it('converts input after the shared parser normalizes whitespace and line endings', async () => {
    const caseConverter = tuiBoxSources.find(
      (source) => source.name === 'Case Converter',
    );
    if (!caseConverter)
      throw new Error('Case Converter missing from TUI registry');

    const boxes = await runBoxes('  fooBar  \r\n\r\n bazQux \r\n::case=snake', [
      caseConverter,
    ]);
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.plaintextOutput).toBe('foo_bar\n\nbaz_qux');
  });

  it('converts a unix timestamp into RFC 3339 boxes', async () => {
    const boxes = await runBoxes('1700000000');
    const names = boxes.map((box) => box.props.name);
    expect(names).toContain('RFC 3339');
    expect(boxes.every((box) => box.boxTemplate === undefined)).toBe(true);
  });

  it('returns no boxes for unmatched input', async () => {
    const boxes = await runBoxes('this should match nothing at all zzz', []);
    expect(boxes).toHaveLength(0);
  });

  it('every TUI source omits a react template (mui-free graph)', async () => {
    expect(tuiBoxSources.length).toBeGreaterThan(70);
    expect(tuiBoxSources.map((source) => source.name)).not.toContain(
      'Local AI',
    );
    expect(tuiBoxSources.map((source) => source.name)).not.toContain('My IP');
    expect(
      tuiBoxSources.every(
        (source) =>
          source.headless === true && source.sideEffects !== 'network',
      ),
    ).toBe(true);
    for (const source of tuiBoxSources) {
      const result = await runTerminalSources(source.defaultInput, [source]);
      if (source.id === 'certificate-decode') {
        expect(result.errors, source.name).toHaveLength(1);
        continue;
      }
      expect(result.errors, source.name).toHaveLength(0);
      expect(result.boxes.length, source.name).toBeGreaterThan(0);
      for (const box of result.boxes) {
        expect(box.boxTemplate).toBeUndefined();
      }
    }
  });

  it('loads Base64 and Math WASM and renders structured tools as plaintext', async () => {
    expect(
      (await runBoxes('SGVsbG8=')).find(
        (box) => box.props.name === 'Base64 decode',
      )?.props.plaintextOutput,
    ).toBe('Hello');
    expect(
      (await runBoxes('1+2')).find(
        (box) => box.props.name === 'Math Expression',
      )?.props.plaintextOutput,
    ).toBe('3');
    const data = await runBoxes('{"hello":"world"}');
    expect(
      data.some(
        (box) =>
          box.view === 'code' && box.props.plaintextOutput.includes('hello'),
      ),
    ).toBe(true);
    const jwt = tuiBoxSources.find((source) => source.name === 'JWT Decode');
    if (!jwt) throw new Error('JWT missing from terminal registry');
    const decodedJWT = await runBoxes(jwt.defaultInput, [jwt]);
    expect(decodedJWT[0].view).toBe('code');
    expect(
      JSON.parse(decodedJWT[0].props.plaintextOutput).header,
    ).toBeDefined();
    const secret = tuiBoxSources.find((source) => source.name === 'K8s Secret');
    if (!secret) throw new Error('K8s Secret missing from terminal registry');
    const boxes = await runBoxes(secret.defaultInput, [secret]);
    expect(boxes[0].props.plaintextOutput).toContain('username: user');
    expect(boxes[0].view).toBe('keyValue');
  });

  it('isolates source errors without discarding successful conversions', async () => {
    const failing = {
      ...tuiBoxSources[0],
      name: 'Broken source',
      generateBoxes: async () => {
        throw new Error('unavailable');
      },
    };
    const result = await runTerminalSources('uuid', [
      failing,
      ...tuiBoxSources,
    ]);
    expect(result.errors).toEqual([
      {
        id: failing.id ?? failing.name,
        name: 'Broken source',
        message: 'unavailable',
      },
    ]);
    expect(result.boxes.some((box) => box.props.name === 'UUID')).toBe(true);
    await expect(runBoxes('uuid', [failing])).resolves.toHaveLength(1);
  });

  it.each([
    ['math-expression', 'notmath\n::math'],
    ['pbkdf2', 'password\n::pbkdf2'],
  ])('reports explicit %s errors separately from results', async (id, input) => {
    const source = tuiBoxSources.find((candidate) => candidate.id === id);
    if (!source) throw new Error(`${id} missing from TUI registry`);

    const result = await runTerminalSources(input, [source]);
    expect(result.boxes).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).not.toBe('');
  });

  it('keeps valid non-expandable HMAC and Base85 output as success', async () => {
    const hmac = tuiBoxSources.find((source) => source.id === 'hmac');
    const base85 = tuiBoxSources.find((source) => source.id === 'base85');
    if (!hmac || !base85)
      throw new Error('HMAC or Base85 missing from TUI registry');

    const hmacResult = await runTerminalSources('message\n::hmac=secret', [
      hmac,
    ]);
    expect(hmacResult.errors).toHaveLength(0);
    expect(hmacResult.boxes[0].props.showExpandButton).toBe(false);
    expect(hmacResult.boxes[0].props.isError).toBeUndefined();

    const base85Result = await runTerminalSources('hello\n::base85', [base85]);
    expect(base85Result.errors).toHaveLength(0);
    expect(base85Result.boxes[0].props.showExpandButton).toBe(false);
    expect(base85Result.boxes[0].props.plaintextOutput).not.toBe('');
  });
});
