import {
  Component,
  type ComponentType,
  type FunctionComponent,
  lazy,
  type ReactNode,
} from 'react';

import { useLocale } from '../../contexts/LocaleContext';

interface RetryActions {
  retry?: () => void;
  reload?: () => void;
}

export type ErrorBoundaryFallback = (actions: RetryActions) => ReactNode;

const reloadPage = (): void => window.location.reload();

class LazyLoadError extends Error {
  constructor(readonly retry?: () => void) {
    super('A feature could not be loaded.');
  }
}

export function retryableLazy<Props extends object>(
  load: () => Promise<{ default: ComponentType<Props> }>,
): FunctionComponent<Props> {
  const createLazyComponent = () => {
    const component = lazy(async () => {
      try {
        return await load();
      } catch (error) {
        // Vite keeps the failed CSS URL in its preload cache. Running the
        // import again would skip that stylesheet and leave the UI unstyled.
        if (
          error instanceof Error &&
          error.message.startsWith('Unable to preload CSS for ')
        ) {
          throw new LazyLoadError();
        }
        throw new LazyLoadError(() => {
          // Another boundary may have already replaced this failed payload.
          if (current === component) current = createLazyComponent();
        });
      }
    });
    return component;
  };
  let current = createLazyComponent();

  return function RetryableLazyComponent(props: Props) {
    const LazyComponent = current;
    return <LazyComponent {...props} />;
  };
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ErrorBoundaryFallback;
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  hasError: boolean;
  lazyError: LazyLoadError | null;
}

// react's default callback forwards caught errors to console.error, which can
// become a Sentry console breadcrumb. The root installs this redacting hook.
export const handleRootCaughtError = (): void => {};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, lazyError: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      lazyError: error instanceof LazyLoadError ? error : null,
    };
  }

  componentDidUpdate(
    previousProps: ErrorBoundaryProps,
    previousState: ErrorBoundaryState,
  ): void {
    // Reset an existing fallback when its input or route changes. A failure
    // first caught during that change still needs to show its retry action.
    if (
      previousState.hasError &&
      this.state.hasError &&
      !Object.is(this.props.resetKey, previousProps.resetKey)
    ) {
      this.retry();
    }
  }

  private readonly retry = (): void => {
    this.state.lazyError?.retry?.();
    this.setState({ hasError: false, lazyError: null });
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { fallback } = this.props;
    const { lazyError } = this.state;
    // A fresh React.lazy payload can reissue the loader, but browsers may
    // retain a rejected native import for the lifetime of the document.
    const actions: RetryActions = {
      retry: !lazyError || lazyError.retry ? this.retry : undefined,
      reload: lazyError ? reloadPage : undefined,
    };
    return typeof fallback === 'function'
      ? fallback(actions)
      : (fallback ?? <DefaultErrorFallback {...actions} />);
  }
}

const DefaultErrorFallback = ({ retry, reload }: RetryActions): ReactNode => (
  <div data-testid="error-boundary-fallback" role="alert">
    <p>Something went wrong.</p>
    {retry ? (
      <button onClick={retry} type="button">
        Try again
      </button>
    ) : null}
    {reload ? (
      <button onClick={reload} type="button">
        Reload page
      </button>
    ) : null}
  </div>
);

export const TemplateErrorFallback = ({
  retry,
  reload,
}: RetryActions): ReactNode => {
  const { t } = useLocale();
  let message = t('errorBoundary.boxMessage');
  if (reload) {
    message = t(
      retry ? 'errorBoundary.loadMessage' : 'errorBoundary.reloadMessage',
    );
  }
  return (
    <div className="empty" data-testid="box-template-error" role="alert">
      <div className="empty-title">{t('errorBoundary.boxTitle')}</div>
      <div className="empty-sub">{message}</div>
      {retry ? (
        <button className="box-copy" onClick={retry} type="button">
          {t('errorBoundary.retry')}
        </button>
      ) : null}{' '}
      {reload ? (
        <button className="box-copy" onClick={reload} type="button">
          {t('errorBoundary.reload')}
        </button>
      ) : null}
    </div>
  );
};

export const RootErrorFallback = ({
  retry,
  as: Container = 'main',
}: {
  retry?: () => void;
  as?: 'main' | 'div';
}): ReactNode => (
  <Container className="empty" data-testid="app-error" role="alert">
    <div className="empty-title">Magic Box could not load</div>
    <div className="empty-sub">
      {retry
        ? 'Try again or reload the page.'
        : 'Check your connection, then reload the page.'}
    </div>
    {retry ? (
      <button className="box-copy" onClick={retry} type="button">
        Try again
      </button>
    ) : null}{' '}
    <button className="box-copy" onClick={reloadPage} type="button">
      Reload
    </button>
  </Container>
);

export default ErrorBoundary;
