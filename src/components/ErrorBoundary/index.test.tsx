import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import ErrorBoundary, { RootErrorFallback } from './index';

const ThrowingChild = (): React.JSX.Element => {
  throw new Error('private user input');
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
});
