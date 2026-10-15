import { parseInput } from '@functions/parseOptions';
import type { BoxSource } from '@modules/BoxSource';
import { describe, expect, it, vi } from 'vitest';
import certificate from '../../../functions/__test__/fixtures/certificate';
import { tuiBoxSources } from '../../../tui/sources';
import {
  boxSources,
  getBoxSource,
  sharedOptionOwners,
  sourceManifest,
} from '../index';
import { createLazyBoxSource } from '../lazySource';

const manifestIds = sourceManifest.map((source) => source.id);

describe('source manifest', () => {
  it('keeps the complete ordered registry in stable-id form', () => {
    expect(sourceManifest).toHaveLength(90);
    expect(new Set(manifestIds).size).toBe(sourceManifest.length);
    expect(
      manifestIds.every((id) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)),
    ).toBe(true);
    expect(manifestIds.slice(0, 4)).toEqual([
      'color',
      'color-contrast',
      'escape-string',
      'base64-decode',
    ]);
    expect(manifestIds.slice(-4)).toEqual([
      'case-converter',
      'certificate-decode',
      'cheat-sheet',
      'coordinates',
    ]);
    expect(getBoxSource('DMS Coordinates')?.id).toBe('coordinates');
    expect(getBoxSource('coordinates')?.name).toBe('Coordinates');
    expect(getBoxSource('missing-source')).toBeNull();
  });

  it('keeps manifest metadata and default inputs aligned with loaded sources', async () => {
    for (const manifest of sourceManifest) {
      const registered = getBoxSource(manifest.id);
      if (!registered?.load) throw new Error(`${manifest.id} has no loader`);

      const loaded = await registered.load();
      expect({
        name: manifest.name,
        description: manifest.description,
        defaultInput: manifest.defaultInput,
        tag: manifest.tag,
        kind: manifest.kind,
        priority: manifest.priority,
        defaultDisabled: manifest.defaultDisabled ?? false,
      }).toEqual({
        name: loaded.name,
        description: loaded.description,
        defaultInput: loaded.defaultInput,
        tag: loaded.tag,
        kind: loaded.kind,
        priority: loaded.priority,
        defaultDisabled: loaded.defaultDisabled ?? false,
      });
    }
  });

  it('keeps conservative matchers compatible with their default inputs', () => {
    for (const manifest of sourceManifest) {
      if (!manifest.canHandle) continue;

      const registered = getBoxSource(manifest.id);
      if (!registered) throw new Error(`${manifest.id} missing from registry`);
      const [input, options] = parseInput(manifest.defaultInput);
      expect(registered.canHandle?.(input, options)).toBe(true);
    }
  });

  it.each([
    ['local-ai', '::localai'],
    ['base85', 'hello\n::ascii85'],
    ['duration', '10\n::parseduration'],
    ['timestamp', '1735794245\n::unix'],
    ['certificate-decode', certificate],
  ])('keeps supported aliases lazy and functional: %s', async (id, raw) => {
    const registered = getBoxSource(id);
    expect(registered).not.toBeNull();
    const [input, options] = parseInput(raw);
    expect(registered?.canHandle?.(input, options)).toBe(true);
    await expect(
      registered?.generateBoxes(input, options),
    ).resolves.not.toEqual([]);
  });

  it('keeps Math lazy for date and phone noise but honors explicit math', async () => {
    let imported = 0;
    vi.resetModules();
    vi.doMock('../MathExpressionBoxSource', async () => {
      imported += 1;
      return vi.importActual('../MathExpressionBoxSource');
    });

    const registry = await import('../index');
    const math = registry.getBoxSource('math-expression');
    if (!math) throw new Error('math source missing');

    const [dateInput, dateOptions] = parseInput('2024-01-01');
    const [phoneInput, phoneOptions] = parseInput('0912-345-678');
    expect(math.canHandle?.(dateInput, dateOptions)).toBe(false);
    expect(math.canHandle?.(phoneInput, phoneOptions)).toBe(false);
    await math.generateBoxes(dateInput, dateOptions);
    await math.generateBoxes(phoneInput, phoneOptions);
    expect(imported).toBe(0);

    const [explicitInput, explicitOptions] = parseInput('2024-01-01\n::math');
    expect(math.canHandle?.(explicitInput, explicitOptions)).toBe(true);
    const boxes = await math.generateBoxes(explicitInput, explicitOptions);
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.plaintextOutput).toBe('2022');
    expect(imported).toBe(1);

    vi.doUnmock('../MathExpressionBoxSource');
    vi.resetModules();
  });

  it('does not load Data Converter for plain text or a bare date', async () => {
    let imported = 0;
    vi.resetModules();
    vi.doMock('../DataConverterBoxSource', async () => {
      imported += 1;
      return vi.importActual('../DataConverterBoxSource');
    });

    const registry = await import('../index');
    const converter = registry.getBoxSource('data-converter');
    expect(converter).not.toBeNull();
    const [plainInput, plainOptions] = parseInput('hello');
    const [dateInput, dateOptions] = parseInput('2026-10-15');
    expect(converter?.canHandle?.(plainInput, plainOptions)).toBe(false);
    expect(converter?.canHandle?.(dateInput, dateOptions)).toBe(false);
    await converter?.generateBoxes(plainInput, plainOptions);
    await converter?.generateBoxes(dateInput, dateOptions);
    expect(imported).toBe(0);

    const validDocuments = [
      '{"ok":true}',
      'name: value\nkind: demo',
      '[section]\nname = "value"',
      '"max-body"=100',
      "'literal key'=100",
      'server . "max-body" . \'limit\'=100',
      '<root><name>value</name></root>',
    ];
    for (const document of validDocuments) {
      const [input, options] = parseInput(document);
      expect(converter?.canHandle?.(input, options)).toBe(true);
      await converter?.generateBoxes(input, options);
    }
    const [singleLineYaml, singleLineOptions] = parseInput('name: value');
    expect(converter?.canHandle?.(singleLineYaml, singleLineOptions)).toBe(
      false,
    );
    expect(imported).toBe(1);

    vi.doUnmock('../DataConverterBoxSource');
    vi.resetModules();
  });

  it('documents every intentional option collision', () => {
    const owners = new Map<string, string[]>();
    for (const source of sourceManifest) {
      for (const key of source.optionKeys ?? []) {
        const ids = owners.get(key) ?? [];
        ids.push(source.id);
        owners.set(key, ids);
      }
    }

    const collisions = Object.fromEntries(
      [...owners.entries()].filter(([, ids]) => ids.length > 1),
    );
    expect(collisions).toEqual(sharedOptionOwners);
  });

  it('keeps the headless registry aligned with the TUI metadata', () => {
    expect(tuiBoxSources.map((source) => source.id)).toEqual(
      boxSources.filter((source) => source.headless).map((source) => source.id),
    );
    expect(
      boxSources
        .filter((source) => !source.headless)
        .map((source) => source.id),
    ).toEqual(['generate-qr-code', 'my-ip', 'shorten-url', 'local-ai']);
  });
});

describe('lazy source wrapper', () => {
  const definition = (load: () => Promise<BoxSource>) => ({
    id: 'test-source',
    name: 'Test Source',
    description: 'test source',
    defaultInput: 'test',
    tag: '#',
    kind: 'Test',
    optionKeys: ['test'],
    canHandle: (
      _input: string,
      options: Record<string, string | boolean> | null,
    ) => options?.test !== undefined,
    load,
  });

  it('does not load when the cheap matcher rejects an input', async () => {
    const load = vi.fn<() => Promise<BoxSource>>();
    const source = createLazyBoxSource(definition(load));

    await expect(source.generateBoxes('plain input', null)).resolves.toEqual(
      [],
    );
    expect(load).not.toHaveBeenCalled();
  });

  it('caches concurrent loads and preserves the loaded source this binding', async () => {
    let calledWithSource = false;
    const loaded: BoxSource = {
      name: 'Test Source',
      description: 'test source',
      defaultInput: 'test',
      tag: '#',
      kind: 'Test',
      generateBoxes: async function () {
        calledWithSource = this === loaded;
        return [];
      },
    };
    const load = vi.fn().mockResolvedValue(loaded);
    const source = createLazyBoxSource(definition(load));
    const first = source.load();
    const second = source.load();

    expect(first).toBe(second);
    await Promise.all([first, second]);
    await source.generateBoxes('input', { test: true });

    expect(load).toHaveBeenCalledTimes(1);
    expect(calledWithSource).toBe(true);
  });

  it('evicts a rejected load so a later attempt can retry', async () => {
    const loaded: BoxSource = {
      name: 'Test Source',
      description: 'test source',
      defaultInput: 'test',
      tag: '#',
      kind: 'Test',
      generateBoxes: async () => [],
    };
    const load = vi
      .fn<() => Promise<BoxSource>>()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce(loaded);
    const source = createLazyBoxSource(definition(load));

    await expect(source.load()).rejects.toThrow('transient');
    await expect(source.load()).resolves.toBe(loaded);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('honors cancellation before loading and after a pending load', async () => {
    const loaded: BoxSource = {
      name: 'Test Source',
      description: 'test source',
      defaultInput: 'test',
      tag: '#',
      kind: 'Test',
      generateBoxes: async () => [],
    };
    let resolveLoad: ((source: BoxSource) => void) | undefined;
    const load = vi.fn(
      () =>
        new Promise<BoxSource>((resolve) => {
          resolveLoad = resolve;
        }),
    );
    const source = createLazyBoxSource(definition(load));
    const before = new AbortController();
    before.abort();

    await expect(
      source.generateBoxes(
        'input',
        { test: true },
        { signal: before.signal, preview: false },
      ),
    ).resolves.toEqual([]);
    expect(load).not.toHaveBeenCalled();

    const after = new AbortController();
    const pending = source.generateBoxes(
      'input',
      { test: true },
      { signal: after.signal, preview: false },
    );
    after.abort();
    resolveLoad?.(loaded);

    await expect(pending).resolves.toEqual([]);
    expect(load).toHaveBeenCalledTimes(1);
  });
});

describe('lazy source parity', () => {
  it('matches direct source output for a deterministic headless source', async () => {
    const input = 'b\na\nb\n::uniquelines';
    const [parsedInput, options] = parseInput(input);
    const registered = getBoxSource('line-tools');
    if (!registered) throw new Error('line-tools missing from registry');
    const { default: direct } = await import('../LineToolsBoxSource');

    const [lazyBoxes, directBoxes] = await Promise.all([
      registered.generateBoxes(parsedInput, options),
      direct.generateBoxes(parsedInput, options),
    ]);
    expect(lazyBoxes.map((box) => box.props.plaintextOutput)).toEqual(
      directBoxes.map((box) => box.props.plaintextOutput),
    );
  });

  it.each([
    '"max-body"=100',
    "'literal key'=100",
    'server . "max-body" . \'limit\'=100',
  ])('matches direct Data Converter output for TOML key syntax: %s', async (raw) => {
    const registered = getBoxSource('data-converter');
    if (!registered) throw new Error('data-converter missing from registry');
    const { default: direct } = await import('../DataConverterBoxSource');
    const [input, options] = parseInput(raw);

    expect(registered.canHandle?.(input, options)).toBe(true);
    const [lazyBoxes, directBoxes] = await Promise.all([
      registered.generateBoxes(input, options),
      direct.generateBoxes(input, options),
    ]);
    expect(lazyBoxes.map((box) => box.props.plaintextOutput)).toEqual(
      directBoxes.map((box) => box.props.plaintextOutput),
    );
    expect(lazyBoxes).not.toEqual([]);
  });

  it.each([
    ['-1000000000', true],
    ['+1735794245', true],
    ['-1000000000000', true],
    ['+1735794245000000', true],
    ['-1000000000000000000', true],
    ['+0000000000000000000000001735794245', true],
    ['123', false],
    ['+not-a-time', false],
    ['0\n::timestamp', true],
  ])('matches direct Timestamp output for %s', async (raw, expectedCanHandle) => {
    const registered = getBoxSource('timestamp');
    if (!registered) throw new Error('timestamp missing from registry');
    const { default: direct } = await import('../TimestampBoxSource');
    const [input, options] = parseInput(raw);

    expect(registered.canHandle?.(input, options)).toBe(expectedCanHandle);
    const [lazyBoxes, directBoxes] = await Promise.all([
      registered.generateBoxes(input, options),
      direct.generateBoxes(input, options),
    ]);
    expect(
      lazyBoxes.map((box) => [box.props.name, box.props.plaintextOutput]),
    ).toEqual(
      directBoxes.map((box) => [box.props.name, box.props.plaintextOutput]),
    );
  });
});
