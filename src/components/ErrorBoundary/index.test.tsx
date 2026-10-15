import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';

import ErrorBoundary, {
  handleRootCaughtError,
  RootErrorFallback,
} from './index';

const ThrowingChild = (): React.JSX.Element => {
  throw new Error('private user input');
};

const ThrowingValue = ({ value }: { value: unknown }): React.JSX.Element => {
  throw value;
};

describe('<ErrorBoundary />', () => {
  it('shows a safe root fallback without exposing the thrown error', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={(retry) => <RootErrorFallback retry={retry} />}>
        <ThrowingChild />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('app-error')).toHaveTextContent(
      'Magic Box could not load',
    );
    expect(screen.getByTestId('app-error')).not.toHaveTextContent(
      'private user input',
    );
    errorSpy.mockRestore();
  });

  it('retries after the parent makes the failed tree valid', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const Recovering = (): React.JSX.Element => {
      const [broken, setBroken] = useState(true);
      return (
        <>
          <button onClick={() => setBroken(false)} type="button">
            fix
          </button>
          <ErrorBoundary
            fallback={(retry) => (
              <button onClick={retry} type="button">
                retry
              </button>
            )}
            resetKey={broken}
          >
            {broken ? <ThrowingChild /> : <p>recovered</p>}
          </ErrorBoundary>
        </>
      );
    };

    render(<Recovering />);
    fireEvent.click(screen.getByRole('button', { name: 'fix' }));
    expect(screen.getByText('recovered')).toBeInTheDocument();
    errorSpy.mockRestore();
  });

  it('handles null and non-Error throws and resets to valid content', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const Recovering = (): React.JSX.Element => {
      const [mode, setMode] = useState<'null' | 'string' | 'valid'>('null');
      return (
        <>
          <button onClick={() => setMode('string')} type="button">
            throw string
          </button>
          <button onClick={() => setMode('valid')} type="button">
            recover
          </button>
          <ErrorBoundary resetKey={mode}>
            {mode === 'valid' ? (
              <p>recovered</p>
            ) : (
              <ThrowingValue value={mode === 'null' ? null : 'private'} />
            )}
          </ErrorBoundary>
        </>
      );
    };

    render(<Recovering />);
    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'throw string' }));
    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'recover' }));
    expect(screen.getByText('recovered')).toBeInTheDocument();
    errorSpy.mockRestore();
  });

  it('redacts caught errors from the production root callback', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const container = document.createElement('div');
    document.body.append(container);
    const root = ReactDOM.createRoot(container, {
      onCaughtError: handleRootCaughtError,
    });

    await act(async () => {
      root.render(
        <ErrorBoundary
          fallback={(retry) => <RootErrorFallback retry={retry} />}
        >
          <ThrowingChild />
        </ErrorBoundary>,
      );
    });
    await waitFor(() =>
      expect(screen.getByTestId('app-error')).toBeInTheDocument(),
    );

    expect(errorSpy).not.toHaveBeenCalled();
    root.unmount();
    container.remove();
    errorSpy.mockRestore();
  });
});
