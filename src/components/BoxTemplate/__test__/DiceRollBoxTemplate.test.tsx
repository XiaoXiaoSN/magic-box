import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import DiceRollBoxTemplate from '../DiceRollBoxTemplate';

const props = {
  name: 'Dice Roll',
  plaintextOutput: 'Dice: 2\nRolls: [1,6]\nTotal: 7',
  options: { Dice: '2', Rolls: '[1,6]', Total: '7' },
  onClick: vi.fn(),
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mockMotion(reduced = false) {
  const cancel = vi.fn();
  const animate = vi.fn(() => ({ cancel }));
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
  return { animate, cancel, media };
}

describe('DiceRollBoxTemplate', () => {
  it('exposes individual results, draws all six faces, and copies the exact total', () => {
    mockMotion();
    const { container } = render(<DiceRollBoxTemplate {...props} />);
    expect(screen.getByRole('img', { name: 'Die 1: 1' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Die 2: 6' })).toBeTruthy();
    expect(container.querySelectorAll('.dice-roll-face')).toHaveLength(12);
    fireEvent.click(screen.getByRole('button', { name: 'Copy total: 7' }));
    expect(props.onClick).toHaveBeenCalledWith('7');
  });

  it('replays identical new rolls and cancels animations on replacement and unmount', () => {
    const { animate, cancel } = mockMotion();
    const { rerender, unmount } = render(<DiceRollBoxTemplate {...props} />);
    expect(animate).toHaveBeenCalledTimes(2);
    rerender(<DiceRollBoxTemplate {...props} options={{ ...props.options }} />);
    expect(cancel).toHaveBeenCalledTimes(2);
    expect(animate).toHaveBeenCalledTimes(4);
    unmount();
    expect(cancel).toHaveBeenCalledTimes(4);
  });

  it('shows results immediately without animation when reduced motion is requested', () => {
    const { animate } = mockMotion(true);
    render(<DiceRollBoxTemplate {...props} />);
    expect(animate).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toContain('7');
  });

  it('cancels motion when the system preference changes during a roll', () => {
    const { cancel, media } = mockMotion();
    render(<DiceRollBoxTemplate {...props} />);
    media.matches = true;
    media.addEventListener.mock.calls[0][1]();
    expect(cancel).toHaveBeenCalledTimes(2);
  });
});
