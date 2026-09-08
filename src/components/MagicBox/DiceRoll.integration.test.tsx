import copyTextToClipboard from '@functions/clipboard';
import { DiceRollBoxSource } from '@modules/boxSources/DiceRollBoxSource';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
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

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  let roll = 0;
  vi.spyOn(crypto, 'getRandomValues').mockImplementation((buffer) => {
    (buffer as Uint32Array).fill(roll++ % 6);
    return buffer;
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('dice result ownership', () => {
  it('keeps re-roll, header copy, total copy, and selected-result keyboard copy synchronized', async () => {
    render(
      <LocaleProvider>
        <MagicBox input="::roll=2" sources={[DiceRollBoxSource]} />
      </LocaleProvider>,
    );
    await screen.findByRole('button', { name: 'Re-roll' });
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('2'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Re-roll' }));
    expect(copyTextToClipboard).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('4'),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Copy Dice Roll output' }),
    );
    expect(copyTextToClipboard).toHaveBeenLastCalledWith(
      'Dice: 2\nRolls: [2,2]\nTotal: 4',
    );
    vi.mocked(copyTextToClipboard).mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Copy total: 4' }));
    expect(copyTextToClipboard).toHaveBeenCalledExactlyOnceWith('4');
    fireEvent.keyDown(window, { key: 'n', ctrlKey: true });
    vi.mocked(copyTextToClipboard).mockClear();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Re-roll' }), {
      key: 'Enter',
    });
    expect(copyTextToClipboard).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(copyTextToClipboard).toHaveBeenCalledExactlyOnceWith(
      'Dice: 2\nRolls: [2,2]\nTotal: 4',
    );
  });
});
