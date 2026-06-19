import { buildVersion } from '@global/buildInfo';
import env from '@global/env';
import CssBaseline from '@mui/material/CssBaseline';
import { browserTracingIntegration, init } from '@sentry/react';
import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import { loadPrefs } from './contexts/PreferencesContext';
import { isAnalyticsEnabled, setRuntimePrefs } from './functions/runtimePrefs';
import './index.css';

// seed runtime prefs and theme/density before first paint so plain modules
// (box sources, telemetry gate) read user values and there is no theme flash.
const initialPrefs = loadPrefs();
setRuntimePrefs({
  timezoneOffset: initialPrefs.timezoneOffset,
  toolboxUrl: initialPrefs.toolboxUrl,
  shortenUrl: initialPrefs.shortenUrl,
  analytics: initialPrefs.analytics,
});
document.documentElement.dataset.theme = initialPrefs.theme;
document.documentElement.dataset.density = initialPrefs.density;

// defer firebase init until the browser is idle so the analytics SDK
// (~150KB gzipped) does not block first paint.
const loadFirebase = () => {
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

  integrations: [browserTracingIntegration()],

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  // Set `tracePropagationTargets` to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: ['localhost', /^https:\/\/mb\.10oz\.tw/],

  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
  // Enable logs to be sent to Sentry
  _experiments: { enableLogs: true },

  // honor the "anonymous usage" toggle at runtime: drop every event/transaction
  // unless the user has opted in. reads the live runtime flag so toggling the
  // setting takes effect without a reload.
  beforeSend: (event) => (isAnalyticsEnabled() ? event : null),
  beforeSendTransaction: (event) => (isAnalyticsEnabled() ? event : null),
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);
root.render(
  <React.StrictMode>
    {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
    <CssBaseline />
    <App />
  </React.StrictMode>,
);

document.documentElement.dataset.buildVersion = buildVersion;
