import { BoxBuilder } from '@modules/Box';
import { render } from 'ink-testing-library';
import { act, createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { App, ResultList } from '../App';
import { runBoxes, type TerminalRunResult } from '../runBoxes';

describe('<ResultList />', () => {
  it('renders box name and plaintext output', async () => {
    const boxes = await runBoxes('uuid');
    const { lastFrame } = render(createElement(ResultList, { boxes }));
    const frame = lastFrame() ?? '';
    expect(frame).toContain('UUID');
    expect(frame).toContain(boxes[0].props.plaintextOutput);
  });

  it('renders a placeholder when a completed query has no boxes', () => {
    const { lastFrame } = render(createElement(ResultList, { boxes: [] }));
    expect(lastFrame()).toContain('no matching boxes');
  });
});

describe('interactive search', () => {
  it('shows instructions before input and debounces live generation', async () => {
    const generate = vi.fn(async () => ({ boxes: [], errors: [] }));
    const screen = render(createElement(App, { generate }));
    expect(screen.lastFrame()).toContain('Type input to see matching boxes');
    expect(screen.lastFrame()).not.toContain('no matching boxes');

    act(() => {
      screen.stdin.write('u');
      screen.stdin.write('u');
    });
    await vi.waitFor(() => expect(generate).toHaveBeenCalledTimes(1));
    screen.unmount();
  });

  it('selects with arrows and Enter copies the selected result', async () => {
    const boxes = [
      new BoxBuilder('First', 'one').build(),
      new BoxBuilder('Second', 'two').build(),
    ];
    const copy = vi.fn();
    const generate = vi.fn(
      async (): Promise<TerminalRunResult> => ({
        boxes,
        errors: [],
      }),
    );
    const screen = render(
      createElement(App, { initialInput: 'query', generate, copy }),
    );
    await vi.waitFor(() => expect(screen.lastFrame()).toContain('First'));
    act(() => screen.stdin.write('\u001b[B'));
    await vi.waitFor(() => expect(screen.lastFrame()).toContain('› Second'));
    act(() => screen.stdin.write('\r'));
    await vi.waitFor(() => expect(copy).toHaveBeenCalledWith('two'));
    screen.unmount();
  });

  it('copies on Ctrl+Y and ignores a late result after the query changes', async () => {
    const first = new BoxBuilder('Stale', 'old').build();
    const latest = new BoxBuilder('Latest', 'fresh').build();
    const firstRequest: {
      resolve: ((result: TerminalRunResult) => void) | null;
    } = { resolve: null };
    const generate = vi.fn((input: string) => {
      if (input === 'first')
        return new Promise<TerminalRunResult>((resolve) => {
          firstRequest.resolve = resolve;
        });
      return Promise.resolve({ boxes: [latest], errors: [] });
    });
    const copy = vi.fn();
    const screen = render(
      createElement(App, { initialInput: 'first', generate, copy }),
    );
    await vi.waitFor(() => expect(generate).toHaveBeenCalledTimes(1));
    act(() => screen.stdin.write('x'));
    await vi.waitFor(() => expect(screen.lastFrame()).toContain('Latest'));
    act(() => screen.stdin.write('\u0019'));
    await vi.waitFor(() => expect(copy).toHaveBeenCalledWith('fresh'));
    firstRequest.resolve?.({ boxes: [first], errors: [] });
    expect(screen.lastFrame()).not.toContain('Stale');
    screen.unmount();
  });

  it('keeps multiple errors from one source distinct across query updates', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const generate = vi.fn(
      async (input: string): Promise<TerminalRunResult> => {
        const prefix = input === 'coordinates' ? 'old' : 'new';
        return {
          boxes: [],
          errors: [
            {
              id: 'coordinates',
              name: 'Coordinates',
              message: `${prefix} UTM error`,
            },
            {
              id: 'coordinates',
              name: 'Coordinates',
              message: `${prefix} MGRS error`,
            },
          ],
        };
      },
    );
    const screen = render(
      createElement(App, { initialInput: 'coordinates', generate }),
    );

    try {
      await vi.waitFor(() => {
        expect(screen.lastFrame()).toContain('old UTM error');
        expect(screen.lastFrame()).toContain('old MGRS error');
      });
      act(() => screen.stdin.write('x'));
      await vi.waitFor(() => {
        expect(screen.lastFrame()).toContain('new UTM error');
        expect(screen.lastFrame()).toContain('new MGRS error');
      });
      expect(screen.lastFrame()).not.toContain('old UTM error');
      expect(screen.lastFrame()).not.toContain('old MGRS error');
      expect(consoleError.mock.calls.flat().join(' ')).not.toContain(
        'same key',
      );
    } finally {
      screen.unmount();
      consoleError.mockRestore();
    }
  });
});
