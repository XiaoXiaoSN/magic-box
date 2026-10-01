import { BoxBuilder } from '@modules/Box';
import { render } from 'ink-testing-library';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { App, ResultList } from '../App';
import { runBoxes } from '../runBoxes';

// render smoke test: confirms the ink layer paints a box's name and plaintext
// output to the (virtual) terminal frame.
describe('<ResultList />', () => {
  it('renders box name and plaintext output', async () => {
    const boxes = await runBoxes('uuid');
    const { lastFrame } = render(createElement(ResultList, { boxes }));
    const frame = lastFrame() ?? '';
    expect(frame).toContain('UUID');
    expect(frame).toContain(boxes[0].props.plaintextOutput);
  });

  it('renders a placeholder when there are no boxes', () => {
    const { lastFrame } = render(createElement(ResultList, { boxes: [] }));
    expect(lastFrame()).toContain('no matching boxes');
  });
});

describe('interactive navigation', () => {
  it('selects results with Ctrl+N/P and copies only on Ctrl+Y', async () => {
    const boxes = [
      new BoxBuilder('First', 'one').build(),
      new BoxBuilder('Second', 'two').build(),
    ];
    const copy = vi.fn();
    const generate = vi.fn().mockResolvedValue(boxes);
    const screen = render(
      createElement(App, { initialInput: 'query', generate, copy }),
    );
    screen.stdin.write('\r');
    await vi.waitFor(() => expect(screen.lastFrame()).toContain('First'));
    expect(copy).not.toHaveBeenCalled();
    screen.stdin.write('\u000e');
    await vi.waitFor(() => expect(screen.lastFrame()).toContain('› Second'));
    screen.stdin.write('\u0019');
    await vi.waitFor(() => expect(copy).toHaveBeenCalledWith('two'));
    screen.stdin.write('\u0010');
    await vi.waitFor(() => expect(screen.lastFrame()).toContain('› First'));
    screen.unmount();
  });

  it('keeps the latest result when an earlier request finishes late', async () => {
    let finish:
      | ((boxes: ReturnType<BoxBuilder['build']>[]) => void)
      | undefined;
    const generate = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValueOnce([new BoxBuilder('Latest', 'fresh').build()]);
    const screen = render(
      createElement(App, { initialInput: 'query', generate }),
    );
    screen.stdin.write('\r');
    await vi.waitFor(() => expect(generate).toHaveBeenCalledTimes(1));
    screen.stdin.write('\r');
    await vi.waitFor(() => expect(screen.lastFrame()).toContain('Latest'));
    finish?.([new BoxBuilder('Stale', 'old').build()]);
    await vi.waitFor(() => expect(screen.lastFrame()).not.toContain('Stale'));
    screen.unmount();
  });
});
