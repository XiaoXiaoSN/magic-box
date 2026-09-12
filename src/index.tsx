import { buildVersion } from '@global/buildInfo';
import env from '@global/env';
import { applyThemeMode, resolveTheme } from '@global/theme';
import { browserTracingIntegration, getClient, init } from '@sentry/react';
import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import { loadPrefs } from './contexts/PreferencesContext';
import {
  activateLocalAIPrivacy,
  isLocalAIMode,
  subscribeLocalAIPrivacy,
} from './functions/localAIPrivacy';
import { isAnalyticsEnabled, setRuntimePrefs } from './functions/runtimePrefs';
import './index.css';

// a shared `::ai` link mounts the local AI box on first paint, so close the
// telemetry gate before any SDK is constructed rather than after React mounts.
if (isLocalAIMode(window.location.search)) activateLocalAIPrivacy();

// seed runtime prefs and theme/density before first paint so plain modules
// (box sources, telemetry gate) read user values and there is no theme flash.
const initialPrefs = loadPrefs();
setRuntimePrefs({
  timezoneOffset: initialPrefs.timezoneOffset,
  toolboxUrl: initialPrefs.toolboxUrl,
  shortenUrl: initialPrefs.shortenUrl,
  analytics: initialPrefs.analytics,
});
// `system` is collapsed against the OS setting here so the css variable block
// matches on the very first paint; AppThemeProvider keeps it live afterwards.
applyThemeMode(resolveTheme(initialPrefs.theme));
document.documentElement.dataset.density = initialPrefs.density;

// defer firebase init until the browser is idle so the analytics SDK
// (~150KB gzipped) does not block first paint.
const loadFirebase = () => {
  // never fetch the analytics SDK at all when reporting is not allowed.
  if (!isAnalyticsEnabled()) return;
  import('./firebaseConfig').catch(() => {
    /* analytics is best-effort */
  });
};
type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void;
};
const w = window as IdleWindow;
if (typeof w.requestIdleCallback === 'function') {
  w.requestIdleCallback(loadFirebase, { timeout: 4000 });
} else {
  setTimeout(loadFirebase, 2000);
}

init({
  dsn: env.SENTRY_DSN,

  enabled: isAnalyticsEnabled(),

  integrations: [browserTracingIntegration()],

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  // Set `tracePropagationTargets` to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: ['localhost', /^https:\/\/mb\.10oz\.tw/],

  // No default PII, and no log forwarding: worker failures are already mapped
  // to fixed error codes, so uploading raw logs could only leak user text.
  sendDefaultPii: false,
  _experiments: { enableLogs: false },

  // honor the "anonymous usage" toggle at runtime: drop every event/transaction
  // unless the user has opted in. reads the live runtime flag so toggling the
  // setting takes effect without a reload.
  beforeBreadcrumb: (breadcrumb) => (isAnalyticsEnabled() ? breadcrumb : null),
  beforeSend: (event) => (isAnalyticsEnabled() ? event : null),
  beforeSendTransaction: (event) => (isAnalyticsEnabled() ? event : null),
});

// The gate above already drops events; closing the client also stops automatic
// session reporting once the user opens the local AI box mid-visit.
subscribeLocalAIPrivacy(() => {
  // `close` returns a PromiseLike, so adopt it before attaching a handler.
  void Promise.resolve(getClient()?.close(1)).catch(() => undefined);
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

document.documentElement.dataset.buildVersion = buildVersion;
