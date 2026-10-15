import copyTextToClipboard from '@functions/clipboard';
import type { Box, BoxProps } from '@modules/Box';
import { BoxBuilder } from '@modules/Box';
import type { BoxSource } from '@modules/BoxSource';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { memo } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LocaleProvider } from '../../contexts/LocaleContext';
import MagicBox from './index';

const { noSources } = vi.hoisted(() => ({ noSources: [] }));

vi.mock('@functions/clipboard', () => ({ default: vi.fn() }));
vi.mock('../../contexts/SettingsContext', () => ({
  useSettings: () => ({ filteredBoxSources: noSources }),
}));
vi.mock('../../contexts/PreferencesContext', () => ({
  usePreferences: () => ({ prefs: { copyMode: 'copy' } }),
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
});

describe('MagicBox source pipeline', () => {
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
