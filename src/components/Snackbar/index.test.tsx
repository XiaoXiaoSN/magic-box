import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LocaleProvider } from '../../contexts/LocaleContext';
import CustomizedSnackbar from './index';

afterEach(() => {
  vi.useRealTimers();
});

describe('<CustomizedSnackbar />', () => {
  it('restarts its auto-hide duration for a new notification id', () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <LocaleProvider>
        <CustomizedSnackbar notify={{ id: 1, severity: 'success' }} />
      </LocaleProvider>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Copied');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    rerender(
      <LocaleProvider>
        <CustomizedSnackbar notify={{ id: 2, severity: 'success' }} />
      </LocaleProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(1499);
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Copied');
    act(() => {
      vi.advanceTimersByTime(601);
    });
    expect(screen.getByRole('alert')).toHaveStyle({ opacity: 0 });
  });

  it('renders localized failure severity and feedback', () => {
    render(
      <LocaleProvider>
        <CustomizedSnackbar notify={{ id: 1, severity: 'error' }} />
      </LocaleProvider>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Copy failed');
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-colorError');
  });
});
