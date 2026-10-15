import { Component, type ReactNode } from 'react';

import { useLocale } from '../../contexts/LocaleContext';

export type ErrorBoundaryFallback = (retry: () => void) => ReactNode;

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ErrorBoundaryFallback;
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  error: unknown | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error };
  }

  componentDidUpdate(previousProps: ErrorBoundaryProps): void {
    if (
      this.state.error !== null &&
      !Object.is(this.props.resetKey, previousProps.resetKey)
    ) {
      this.setState({ error: null });
    }
  }

  private readonly retry = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error === null) {
      return this.props.children;
    }

    const { fallback } = this.props;
    if (typeof fallback === 'function') {
      return fallback(this.retry);
    }
    return fallback ?? <DefaultErrorFallback retry={this.retry} />;
  }
}

const DefaultErrorFallback = ({ retry }: { retry: () => void }): ReactNode => (
  <div data-testid="error-boundary-fallback" role="alert">
    <p>Something went wrong.</p>
    <button onClick={retry} type="button">
      Try again
    </button>
  </div>
);

export const TemplateErrorFallback = ({
  retry,
}: {
  retry: () => void;
}): ReactNode => {
  const { t } = useLocale();
  return (
    <div className="empty" data-testid="box-template-error" role="alert">
      <div className="empty-title">{t('errorBoundary.boxTitle')}</div>
      <div className="empty-sub">{t('errorBoundary.boxMessage')}</div>
      <button className="box-copy" onClick={retry} type="button">
        {t('errorBoundary.retry')}
      </button>
    </div>
  );
};

export const RootErrorFallback = ({
  retry,
}: {
  retry: () => void;
}): ReactNode => (
  <main className="empty" data-testid="app-error" role="alert">
    <div className="empty-title">Magic Box could not load</div>
    <div className="empty-sub">Try again or reload the page.</div>
    <button className="box-copy" onClick={retry} type="button">
      Try again
    </button>{' '}
    <button
      className="box-copy"
      onClick={() => window.location.reload()}
      type="button"
    >
      Reload
    </button>
  </main>
);

export default ErrorBoundary;
