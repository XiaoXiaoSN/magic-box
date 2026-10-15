import env from '@global/env';

import {
  isAnalyticsEnabled,
  subscribeAnalyticsPermission,
} from './runtimePrefs';

type SentryModule = Pick<
  typeof import('@sentry/react'),
  'browserTracingIntegration' | 'getClient' | 'init' | 'logger'
>;

let sentryModulePromise: Promise<SentryModule | null> | null = null;
let sentryInitialized = false;
let unsubscribePermission: (() => void) | null = null;

const loadSentryModule = (): Promise<SentryModule | null> => {
  if (sentryModulePromise === null) {
    sentryModulePromise = import('@sentry/react')
      .then(({ browserTracingIntegration, getClient, init, logger }) => ({
        browserTracingIntegration,
        getClient,
        init,
        logger,
      }))
      .catch(() => null);
  }
  return sentryModulePromise;
};

const initializeSentry = (module: SentryModule): void => {
  if (sentryInitialized || !isAnalyticsEnabled()) return;

  sentryInitialized = true;
  module.init({
    dsn: env.SENTRY_DSN,
    integrations: [module.browserTracingIntegration()],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    tracePropagationTargets: ['localhost'],
    sendDefaultPii: false,
    _experiments: { enableLogs: false },
    beforeBreadcrumb: (breadcrumb) =>
      isAnalyticsEnabled() ? breadcrumb : null,
    beforeSend: (event) => (isAnalyticsEnabled() ? event : null),
    beforeSendTransaction: (event) => (isAnalyticsEnabled() ? event : null),
  });
  unsubscribePermission?.();
  unsubscribePermission = null;
};

/** starts Sentry only after permission, rechecking the live gate after import. */
export const startSentryWhenAllowed = (): void => {
  unsubscribePermission = subscribeAnalyticsPermission((enabled) => {
    if (!enabled || sentryInitialized) return;

    void loadSentryModule().then((module) => {
      if (module !== null) initializeSentry(module);
    });
  });
};

/** closes an already requested Sentry client without starting a new import. */
export const closeSentry = (): void => {
  const modulePromise = sentryModulePromise;
  if (modulePromise === null) return;

  void modulePromise
    .then((module) => {
      if (module === null || isAnalyticsEnabled()) return undefined;
      return Promise.resolve(module.getClient()?.close(1));
    })
    .catch(() => undefined);
};

/** reports scanner failures only when the same live permission gate allows it. */
export const reportSentryError = (message: string): void => {
  if (!isAnalyticsEnabled()) return;

  void loadSentryModule()
    .then((module) => {
      if (module !== null && isAnalyticsEnabled()) module.logger.error(message);
    })
    .catch(() => undefined);
};
