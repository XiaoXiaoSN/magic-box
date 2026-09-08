import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import DiceRollBoxTemplate from '../DiceRollBoxTemplate';

vi.mock('../dicePhysics', () => ({
  simulateDiceThrow: vi.fn(async (rolls: number[]) => ({
    frames: [rolls.map(() => ({ x: 0, y: 0, z: 0.5 }))],
    corrections: rolls.map(() => ({})),
  })),
  diceTransform: () => 'translate3d(0px, 0px, 0px)',
}));

const props = {
  name: 'Dice Roll',
  plaintextOutput: 'Dice: 2\nRolls: [1,6]\nTotal: 7',
  options: { Dice: '2', Rolls: '[1,6]', Total: '7' },
  onClick: vi.fn(),
};
const originalAnimate = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'animate',
);
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  if (originalAnimate)
    Object.defineProperty(HTMLElement.prototype, 'animate', originalAnimate);
  else Reflect.deleteProperty(HTMLElement.prototype, 'animate');
});

function mockMotion(reduced = false) {
  const pending: Array<() => void> = [];
  const cancel = vi.fn();
  const animate = vi.fn(() => ({
    cancel,
    finished: new Promise<void>((resolve) => pending.push(resolve)),
  }));
  Object.defineProperty(HTMLElement.prototype, 'animate', {
    configurable: true,
    value: animate,
  });
  const media = {
    matches: reduced,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => media),
  );
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  return {
    animate,
    cancel,
    media,
    finish: async () => {
      await act(async () => {
        for (const resolve of pending.splice(0)) resolve();
      });
    },
  };
}

describe('DiceRollBoxTemplate', () => {
  it('waits for physical playback, then gathering, before revealing results and enabling re-roll', async () => {
    const motion = mockMotion();
    render(<DiceRollBoxTemplate {...props} />);
    expect(screen.getByRole('button', { name: 'Re-roll' })).toBeDisabled();
    await waitFor(() => expect(motion.animate).toHaveBeenCalledTimes(4));
    await motion.finish();
    expect(screen.getByRole('status')).toHaveTextContent('Gathering dice');
    expect(screen.getByRole('button', { name: 'Re-roll' })).toBeDisabled();
    await motion.finish();
    expect(screen.getByRole('img', { name: 'Die 2: 6' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Re-roll' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Copy total: 7' }));
    expect(props.onClick).toHaveBeenCalledWith('7');
  });

  it('re-rolls the same count and publishes consistent plaintext without bubbling a copy', () => {
    mockMotion(true);
    const onResultChange = vi.fn();
    const outerClick = vi.fn();
    render(<DiceRollBoxTemplate {...props} onResultChange={onResultChange} />);
    document.body.addEventListener('click', outerClick);
    fireEvent.click(screen.getByRole('button', { name: 'Re-roll' }));
    document.body.removeEventListener('click', outerClick);
    const next = onResultChange.mock.calls[0][0];
    const rolls: number[] = JSON.parse(next.options.Rolls);
    expect(rolls).toHaveLength(2);
    expect(Number(next.options.Total)).toBe(rolls.reduce((a, b) => a + b, 0));
    expect(next.plaintextOutput).toBe(
      `Dice: 2\nRolls: ${next.options.Rolls}\nTotal: ${next.options.Total}`,
    );
    expect(outerClick).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent(next.options.Total);
  });

  it('skips animation for reduced motion and restores external input after a local re-roll', () => {
    const motion = mockMotion(true);
    const { rerender } = render(<DiceRollBoxTemplate {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Re-roll' }));
    rerender(
      <DiceRollBoxTemplate
        {...props}
        options={{ Dice: '1', Rolls: '[4]', Total: '4' }}
      />,
    );
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(screen.getByRole('img', { name: 'Die 1: 4' })).toBeTruthy();
    expect(motion.animate).not.toHaveBeenCalled();
  });

  it('cancels playback when reduced motion changes and on unmount', async () => {
    const motion = mockMotion();
    const { unmount } = render(<DiceRollBoxTemplate {...props} />);
    await waitFor(() => expect(motion.animate).toHaveBeenCalledTimes(4));
    await act(async () => {
      motion.media.matches = true;
      motion.media.addEventListener.mock.calls[0][1]();
    });
    expect(motion.cancel).toHaveBeenCalledTimes(4);
    expect(screen.getByRole('button', { name: 'Re-roll' })).toBeEnabled();
    unmount();
    expect(motion.cancel).toHaveBeenCalledTimes(8);
  });
});
