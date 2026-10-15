import copyTextToClipboard from '@functions/clipboard';
import type { Box, BoxProps } from '@modules/Box';
import { BoxBuilder } from '@modules/Box';
import type { BoxSource } from '@modules/BoxSource';
import { createLazyBoxSource } from '@modules/boxSources/lazySource';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { memo, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LocaleProvider } from '../../contexts/LocaleContext';
import type {
  ComputeWorkerEvent,
  ComputeWorkerRunRequest,
} from '../../modules/computeWorker/dto';
import MagicBox from './index';

const { noSources } = vi.hoisted(() => ({ noSources: [] }));

vi.mock('@functions/clipboard', () => ({ default: vi.fn() }));
vi.mock('../../contexts/SettingsContext', () => ({
  useSettings: () => ({ filteredBoxSources: noSources }),
}));
vi.mock('../../contexts/PreferencesContext', () => ({
  usePreferences: () => ({
    prefs: { copyMode: 'enter', timezoneOffset: 8, timezoneMode: 'fixed' },
  }),
}));

interface Deferred<T> {
  promise: Promise<T>;
  reject: (error: unknown) => void;
  resolve: (value: T) => void;
}

const deferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, reject, resolve };
};

const sourceWithResult = (name: string, result: Promise<Box[]>): BoxSource => ({
  name,
  description: '',
  defaultInput: '',
  tag: '·',
  kind: 'Test',
  async generateBoxes(): Promise<Box[]> {
    return result;
  },
});

const box = (name: string): Box =>
  new BoxBuilder(name, `${name} output`).setShowExpandButton(false).build();

class FakeComputeWorker {
  static requests: ComputeWorkerRunRequest[] = [];
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null = null;
  terminated = false;

  postMessage(
    message: ComputeWorkerRunRequest | { type: 'cancel'; runId: string },
  ): void {
    if (message.type === 'cancel') return;
    FakeComputeWorker.requests.push(message);
    const event = (next: ComputeWorkerEvent): void => {
      if (!this.terminated)
        this.onmessage?.({ data: next } as MessageEvent<unknown>);
    };
    queueMicrotask(() => {
      event({ type: 'started', runId: message.runId });
      event({
        type: 'source-load-start',
        runId: message.runId,
        sourceId: message.sourceIds[0],
      });
      event({
        type: 'source-start',
        runId: message.runId,
        sourceId: message.sourceIds[0],
      });
      event({
        type: 'source-result',
        runId: message.runId,
        sourceId: message.sourceIds[0],
        boxes: [
          {
            name: 'Worker Result',
            plaintextOutput: 'worker output',
            options: null,
          },
        ],
      });
      event({ type: 'finished', runId: message.runId });
    });
  }

  terminate(): void {
    this.terminated = true;
  }
}

const tree = (input: string, sources: BoxSource[], liveInput = input) => (
  <LocaleProvider>
    <MagicBox input={input} liveInput={liveInput} sources={sources} />
  </LocaleProvider>
);

afterEach(() => {
  cleanup();
  vi.mocked(copyTextToClipboard).mockReset().mockResolvedValue(true);
});

beforeEach(() => {
  vi.mocked(copyTextToClipboard).mockReset().mockResolvedValue(true);
  FakeComputeWorker.requests = [];
});

describe('MagicBox source pipeline', () => {
  it('runs worker-safe sources through the worker batch and preserves source slots', async () => {
    vi.stubGlobal('Worker', FakeComputeWorker);
    const main = sourceWithResult('main', Promise.resolve([box('Main')]));
    const generateBoxes = vi
      .fn()
      .mockRejectedValue(new Error('main path used'));
    const workerSource: BoxSource = {
      id: 'worker-source',
      workerSafe: true,
      name: 'Worker Source',
      description: '',
      defaultInput: '',
      tag: '#',
      kind: 'Compute',
      generateBoxes,
    };

    try {
      render(tree('input', [workerSource, main]));
      expect(await screen.findByText('worker output')).toBeInTheDocument();
      expect(await screen.findByText('Main output')).toBeInTheDocument();
      expect(generateBoxes).not.toHaveBeenCalled();
      expect(FakeComputeWorker.requests).toHaveLength(1);
      expect(FakeComputeWorker.requests[0]).toMatchObject({
        sourceIds: ['worker-source'],
        now: expect.any(Number),
        locale: 'en',
        timezoneOffset: 8,
        timezoneMode: 'fixed',
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('does not import an irrelevant lazy worker source', async () => {
    vi.stubGlobal('Worker', FakeComputeWorker);
    const load = vi.fn(async () =>
      sourceWithResult('irrelevant', Promise.resolve([])),
    );
    const source = createLazyBoxSource({
      id: 'irrelevant-worker',
      name: 'Irrelevant Worker',
      description: '',
      defaultInput: '',
      tag: '#',
      kind: 'Compute',
      workerSafe: true,
      canHandle: () => false,
      load,
    });

    try {
      render(tree('ordinary text', [source]));
      await waitFor(() =>
        expect(
          screen.queryByTestId('magic-box-pending'),
        ).not.toBeInTheDocument(),
      );
      expect(load).not.toHaveBeenCalled();
      expect(FakeComputeWorker.requests).toHaveLength(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('does not import automatic large-input converters', async () => {
    vi.stubGlobal('Worker', FakeComputeWorker);
    const load = vi.fn(async () =>
      sourceWithResult('large', Promise.resolve([])),
    );
    const source = createLazyBoxSource({
      id: 'large-converter',
      name: 'Large Converter',
      description: '',
      defaultInput: '',
      tag: '{ }',
      kind: 'Format',
      workerSafe: true,
      supportsLargeInput: true,
      canHandle: () => true,
      load,
    });

    try {
      render(tree('x'.repeat(256 * 1024 + 1), [source]));
      await waitFor(() =>
        expect(
          screen.queryByTestId('magic-box-pending'),
        ).not.toBeInTheDocument(),
      );
      expect(load).not.toHaveBeenCalled();
      expect(FakeComputeWorker.requests).toHaveLength(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('clears a skipped source slot when a large run replaces a short result', async () => {
    const source: BoxSource = {
      id: 'color',
      name: 'Color',
      description: '',
      defaultInput: '',
      tag: '·',
      kind: 'Test',
      async generateBoxes(input): Promise<Box[]> {
        return input.length <= 256 * 1024 ? [box('Color')] : [box('never')];
      },
    };
    const { rerender } = render(tree('short', [source]));
    expect(await screen.findByText('Color output')).toBeInTheDocument();

    rerender(tree('x'.repeat(256 * 1024 + 1), [source]));
    await waitFor(() =>
      expect(screen.queryByText('Color output')).not.toBeInTheDocument(),
    );
  });

  it('renders each source as it settles while preserving source order', async () => {
    const first = deferred<Box[]>();
    const second = deferred<Box[]>();
    const sources = [
      sourceWithResult('first', first.promise),
      sourceWithResult('second', second.promise),
    ];
    render(tree('input', sources));

    second.resolve([box('Second')]);
    expect(await screen.findByText('Second output')).toBeInTheDocument();
    expect(screen.getByTestId('magic-box-pending')).toBeInTheDocument();
    expect(screen.queryByText('No matches')).not.toBeInTheDocument();

    first.resolve([box('First')]);
    await waitFor(() => {
      expect(screen.queryByTestId('magic-box-pending')).not.toBeInTheDocument();
      expect(screen.getAllByTestId('magic-box-result-title')).toHaveLength(2);
    });
    expect(
      screen
        .getAllByTestId('magic-box-result-title')
        .map((element) => element.textContent),
    ).toEqual(['First', 'Second']);
  });

  it('keeps a selected result stable when an earlier source settles later', async () => {
    const first = deferred<Box[]>();
    const second = deferred<Box[]>();
    const firstClick = vi.fn();
    const secondClick = vi.fn();
    const onPasteInput = vi.fn();
    const onInputCommit = vi.fn();
    const sources = [
      sourceWithResult('first', first.promise),
      sourceWithResult('second', second.promise),
    ];
    const firstBox = new BoxBuilder('First', 'first output')
      .setOnClick(firstClick)
      .setShowExpandButton(false)
      .build();
    const secondBox = new BoxBuilder('Second', 'second output')
      .setOnClick(secondClick)
      .setShowExpandButton(false)
      .build();

    render(
      <LocaleProvider>
        <MagicBox
          input="input"
          onInputCommit={onInputCommit}
          onPasteInput={onPasteInput}
          sources={sources}
        />
      </LocaleProvider>,
    );

    second.resolve([secondBox]);
    const selectedCard = await screen.findByTestId('magic-box-result');
    fireEvent.click(selectedCard);
    await waitFor(() => expect(onInputCommit).toHaveBeenCalledWith('input'));
    vi.mocked(copyTextToClipboard).mockClear();
    secondClick.mockClear();
    onInputCommit.mockClear();

    first.resolve([firstBox]);
    await waitFor(() =>
      expect(screen.getAllByTestId('magic-box-result')).toHaveLength(2),
    );
    const cards = screen.getAllByTestId('magic-box-result');
    expect(cards[0]).not.toHaveClass('is-selected');
    expect(cards[1]).toHaveClass('is-selected');

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(copyTextToClipboard).toHaveBeenLastCalledWith('second output');
    expect(secondClick).toHaveBeenLastCalledWith('second output');
    expect(firstClick).not.toHaveBeenCalled();
    await waitFor(() => expect(onInputCommit).toHaveBeenCalledWith('input'));

    vi.mocked(copyTextToClipboard).mockClear();
    secondClick.mockClear();
    fireEvent.keyDown(window, { key: 'Enter', metaKey: true });
    expect(copyTextToClipboard).toHaveBeenLastCalledWith('second output');
    expect(secondClick).toHaveBeenLastCalledWith('second output');
    await waitFor(() =>
      expect(onPasteInput).toHaveBeenLastCalledWith('second output'),
    );
    expect(onInputCommit).toHaveBeenCalledTimes(2);
    expect(firstClick).not.toHaveBeenCalled();
  });

  it('isolates source failures and settles the pending state', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const healthy = deferred<Box[]>();
    const broken: BoxSource = {
      name: 'Broken',
      description: '',
      defaultInput: '',
      tag: '·',
      kind: 'Test',
      async generateBoxes(): Promise<Box[]> {
        throw new Error('source failed');
      },
    };

    try {
      render(
        tree('input', [broken, sourceWithResult('Healthy', healthy.promise)]),
      );
      healthy.resolve([box('Healthy')]);
      expect(await screen.findByText('Healthy output')).toBeInTheDocument();
      await waitFor(() =>
        expect(
          screen.queryByTestId('magic-box-pending'),
        ).not.toBeInTheDocument(),
      );
      expect(log).toHaveBeenCalledOnce();
    } finally {
      log.mockRestore();
    }
  });

  it('aborts old runs and ignores stale completions', async () => {
    const calls: Array<{
      input: string;
      signal: AbortSignal;
      deferred: Deferred<Box[]>;
    }> = [];
    const source: BoxSource = {
      name: 'Changing',
      description: '',
      defaultInput: '',
      tag: '·',
      kind: 'Test',
      async generateBoxes(input: string, _options, context): Promise<Box[]> {
        const next = deferred<Box[]>();
        calls.push({
          input,
          signal: context?.signal as AbortSignal,
          deferred: next,
        });
        return next.promise;
      },
    };
    const { rerender } = render(tree('old', [source]));
    await waitFor(() => expect(calls).toHaveLength(1));

    rerender(tree('new', [source]));
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[0].signal.aborted).toBe(true);

    calls[0].deferred.resolve([box('Old')]);
    calls[1].deferred.resolve([box('New')]);
    expect(await screen.findByText('New output')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText('Old output')).not.toBeInTheDocument(),
    );
  });

  it('keeps a settled source interactive while a sibling source is pending', async () => {
    const slow = deferred<Box[]>();
    const interactiveTemplate = ({
      onClick,
      onResultChange,
      plaintextOutput,
    }: BoxProps): React.JSX.Element => {
      const [value, setValue] = useState(plaintextOutput);
      return (
        <>
          <input
            aria-label="interactive value"
            value={value}
            onChange={(event) => {
              const next = event.target.value;
              setValue(next);
              onResultChange?.({
                options: { value: next },
                plaintextOutput: next,
              });
            }}
          />
          <span data-testid="interactive-visible">{value}</span>
          <button type="button" onClick={() => onClick(value)}>
            Copy current
          </button>
        </>
      );
    };
    const fastBox = new BoxBuilder('Fast', 'initial')
      .setTemplate(interactiveTemplate)
      .setShowExpandButton(false)
      .build();
    const sources = [
      sourceWithResult('fast', Promise.resolve([fastBox])),
      sourceWithResult('slow', slow.promise),
    ];

    render(tree('input', sources));
    expect(await screen.findByTestId('interactive-visible')).toHaveTextContent(
      'initial',
    );
    expect(screen.getByTestId('magic-box-pending')).toBeInTheDocument();
    const input = screen.getByRole('textbox', {
      name: 'interactive value',
    });
    fireEvent.change(input, { target: { value: 'updated' } });
    expect(screen.getByTestId('interactive-visible')).toHaveTextContent(
      'updated',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Copy current' }));
    expect(copyTextToClipboard).toHaveBeenLastCalledWith('updated');

    slow.resolve([box('Slow')]);
    await waitFor(() =>
      expect(screen.queryByTestId('magic-box-pending')).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId('interactive-visible')).toHaveTextContent(
      'updated',
    );
    expect(copyTextToClipboard).toHaveBeenLastCalledWith('updated');
  });
});

describe('MagicBox live input and keyboard boundaries', () => {
  const immediateSource: BoxSource = {
    name: 'Immediate',
    description: '',
    defaultInput: '',
    tag: '·',
    kind: 'Test',
    async generateBoxes(): Promise<Box[]> {
      return [box('Current')];
    },
  };

  it('starts Alt+Down at the first result when selection is unset', async () => {
    render(
      tree('settled', [
        sourceWithResult('first', Promise.resolve([box('First')])),
        sourceWithResult('second', Promise.resolve([box('Second')])),
      ]),
    );
    const cards = await screen.findAllByTestId('magic-box-result');

    fireEvent.keyDown(window, { altKey: true, key: 'ArrowDown' });

    await waitFor(() => expect(cards[0]).toHaveClass('is-selected'));
    expect(cards[1]).not.toHaveClass('is-selected');
  });

  it('does not intercept Alt+Arrow in a nested editable control', async () => {
    const nestedSource: BoxSource = {
      ...immediateSource,
      async generateBoxes(): Promise<Box[]> {
        const nested = new BoxBuilder('Nested editor', 'output')
          .setShowExpandButton(false)
          .setTemplate(
            ({ plaintextOutput }: BoxProps): React.JSX.Element => (
              <textarea
                aria-label="Local AI prompt"
                defaultValue={plaintextOutput}
              />
            ),
          )
          .build();
        return [nested];
      },
    };

    render(tree('settled', [nestedSource]));
    const input = await screen.findByRole('textbox', {
      name: 'Local AI prompt',
    });
    const event = new KeyboardEvent('keydown', {
      altKey: true,
      bubbles: true,
      cancelable: true,
      key: 'ArrowDown',
    });
    input.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it('disables stale cards and ignores IME, prevented, and outside Enter events', async () => {
    const { rerender } = render(
      <div>
        <button data-testid="outside" type="button">
          Outside
        </button>
        {tree('settled', [immediateSource])}
      </div>,
    );
    const card = await screen.findByTestId('magic-box-result');
    fireEvent.click(card);
    vi.mocked(copyTextToClipboard).mockClear();

    rerender(
      <div>
        <button data-testid="outside" type="button">
          Outside
        </button>
        {tree('settled', [immediateSource], 'being typed')}
      </div>,
    );
    expect(card).toHaveClass('is-stale');

    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyDown(screen.getByTestId('outside'), { key: 'Enter' });
    window.dispatchEvent(
      new KeyboardEvent('keydown', { isComposing: true, key: 'Enter' }),
    );
    const prevented = new KeyboardEvent('keydown', {
      cancelable: true,
      key: 'Enter',
    });
    Object.defineProperty(prevented, 'defaultPrevented', { value: true });
    window.dispatchEvent(prevented);

    expect(copyTextToClipboard).not.toHaveBeenCalled();
    expect(
      screen.getByTestId('magic-box-result').querySelector('button'),
    ).toBeDisabled();
  });

  it('marks old results stale as soon as the debounced input becomes current', async () => {
    const runs: Array<Deferred<Box[]>> = [];
    const source: BoxSource = {
      name: 'Changing',
      description: '',
      defaultInput: '',
      tag: '·',
      kind: 'Test',
      async generateBoxes(): Promise<Box[]> {
        const next = deferred<Box[]>();
        runs.push(next);
        return next.promise;
      },
    };
    const { rerender } = render(tree('old', [source]));
    await waitFor(() => expect(runs).toHaveLength(1));
    runs[0].resolve([box('Old')]);
    const oldCard = await screen.findByTestId('magic-box-result');
    rerender(tree('new', [source]));

    expect(oldCard).toHaveClass('is-stale');
    expect(oldCard.querySelector('button')).toBeDisabled();
    await waitFor(() => expect(runs).toHaveLength(2));
  });

  it('rerenders only changed memoized templates and registers one key listener', async () => {
    const renderCounts = Array.from({ length: 10 }, () => 0);
    const templates = renderCounts.map((_, index) =>
      memo(({ name }: BoxProps): React.JSX.Element => {
        renderCounts[index] += 1;
        return <span>{name}</span>;
      }),
    );
    const source: BoxSource = {
      name: 'Ten boxes',
      description: '',
      defaultInput: '',
      tag: '·',
      kind: 'Test',
      async generateBoxes(): Promise<Box[]> {
        return templates.map((Template, index) =>
          new BoxBuilder(`Box ${index}`, `output ${index}`)
            .setTemplate(Template)
            .setShowExpandButton(false)
            .build(),
        );
      },
    };
    const addListener = vi.spyOn(window, 'addEventListener');

    try {
      render(tree('input', [source]));
      await waitFor(() =>
        expect(screen.getAllByTestId('magic-box-result')).toHaveLength(10),
      );
      const initialCounts = [...renderCounts];
      const keydownCount = () =>
        addListener.mock.calls.filter(([type]) => String(type) === 'keydown')
          .length;
      expect(keydownCount()).toBe(1);

      fireEvent.keyDown(window, { ctrlKey: true, key: 'n' });
      fireEvent.keyDown(window, { ctrlKey: true, key: 'n' });
      await waitFor(() =>
        expect(screen.getAllByTestId('magic-box-result')[1]).toHaveClass(
          'is-selected',
        ),
      );

      const changedTemplates = renderCounts.filter(
        (count, index) => count > initialCounts[index],
      );
      expect(changedTemplates.length).toBeLessThanOrEqual(2);
      expect(keydownCount()).toBe(1);
    } finally {
      addListener.mockRestore();
    }
  });
});
