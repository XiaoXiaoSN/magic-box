import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LocaleProvider, useLocale } from '../../../contexts/LocaleContext';
import DiceRollBoxTemplate from '../DiceRollBoxTemplate';
import { simulateDiceThrow } from '../dicePhysics';

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
  let resize: ((width: number) => void) | null = null;
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        resize = (width) =>
          callback([{ contentRect: { width } } as ResizeObserverEntry], this);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  return {
    animate,
    cancel,
    media,
    resize: (width: number) => resize?.(width),
    finish: async () => {
      await act(async () => {
        for (const resolve of pending.splice(0)) resolve();
      });
    },
  };
}

function renderDice(
  props: React.ComponentProps<typeof DiceRollBoxTemplate>,
): ReturnType<typeof render> {
  return render(
    <LocaleProvider>
      <DiceRollBoxTemplate {...props} />
    </LocaleProvider>,
  );
}

function LocaleSwitcher(): React.JSX.Element {
  const { setLocale } = useLocale();
  return (
    <button onClick={() => setLocale('tw')} type="button">
      switch locale
    </button>
  );
}

describe('DiceRollBoxTemplate', () => {
  it('waits for physical playback, then gathering, before revealing results and enabling re-roll', async () => {
    const motion = mockMotion();
    renderDice(props);
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

  it('runs one physical simulation per roll and only reapplies layout on resize', async () => {
    const motion = mockMotion();
    renderDice({
      ...props,
      options: { Dice: '4', Rolls: '[1,2,3,4]', Total: '10' },
    });
    await waitFor(() => expect(simulateDiceThrow).toHaveBeenCalledTimes(1));

    motion.resize?.(300);
    expect(simulateDiceThrow).toHaveBeenCalledTimes(1);
    expect(
      screen
        .getByTestId('magic-box-dice-roll')
        .querySelector('.dice-roll-tray'),
    ).toHaveStyle({
      height: '308px',
    });
  });

  it('animates a fresh upstream result with unchanged roll values', async () => {
    const motion = mockMotion();
    const options = { Dice: '1', Rolls: '[4]', Total: '4' };
    const { rerender } = renderDice({ ...props, options });
    await waitFor(() => expect(simulateDiceThrow).toHaveBeenCalledTimes(1));

    rerender(
      <LocaleProvider>
        <DiceRollBoxTemplate {...props} options={{ ...options }} />
      </LocaleProvider>,
    );
    await waitFor(() => expect(simulateDiceThrow).toHaveBeenCalledTimes(2));
    expect(motion.animate).toHaveBeenCalled();
  });

  it('updates dice labels on locale changes without rerolling', async () => {
    const motion = mockMotion(true);
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <DiceRollBoxTemplate {...props} />
      </LocaleProvider>,
    );
    expect(simulateDiceThrow).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'switch locale' }));
    expect(simulateDiceThrow).not.toHaveBeenCalled();
    expect(screen.getByText(/顆骰子/)).toBeInTheDocument();
    expect(screen.getByText('總和')).toBeInTheDocument();
    expect(motion.animate).not.toHaveBeenCalled();
  });

  it('re-rolls the same count and publishes consistent plaintext without bubbling a copy', () => {
    mockMotion(true);
    const onResultChange = vi.fn();
    const outerClick = vi.fn();
    renderDice({ ...props, onResultChange });
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
    const { rerender } = renderDice(props);
    fireEvent.click(screen.getByRole('button', { name: 'Re-roll' }));
    rerender(
      <LocaleProvider>
        <DiceRollBoxTemplate
          {...props}
          options={{ Dice: '1', Rolls: '[4]', Total: '4' }}
        />
      </LocaleProvider>,
    );
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(screen.getByRole('img', { name: 'Die 1: 4' })).toBeTruthy();
    expect(motion.animate).not.toHaveBeenCalled();
  });

  it('cancels playback when reduced motion changes and on unmount', async () => {
    const motion = mockMotion();
    const { unmount } = renderDice(props);
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
