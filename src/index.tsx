import { buildVersion } from '@global/buildInfo';
import { applyThemeMode, resolveTheme } from '@global/theme';
import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import { loadPrefs } from './contexts/PreferencesContext';
import {
  activateLocalAIPrivacy,
  isPrivateInputMode,
  subscribeLocalAIPrivacy,
} from './functions/localAIPrivacy';
import {
  setRuntimePrefs,
  whenAnalyticsAllowed,
} from './functions/runtimePrefs';
import { closeSentry, startSentryWhenAllowed } from './functions/sentry';
import './index.css';
import { handleRootCaughtError } from './components/ErrorBoundary';

// a shared private-input link can mount a box on first paint, so close the
// telemetry gate before any SDK is constructed rather than after React mounts.
if (isPrivateInputMode(window.location.search)) activateLocalAIPrivacy();

// seed runtime prefs and theme/density before first paint so plain modules
// (box sources, telemetry gate) read user values and there is no theme flash.
const initialPrefs = loadPrefs();
setRuntimePrefs({
  timezoneOffset: initialPrefs.timezoneOffset,
  timezoneMode: initialPrefs.timezoneMode,
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
  whenAnalyticsAllowed(() => {
    import('./firebaseConfig').catch(() => {
      /* analytics is best-effort */
    });
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

startSentryWhenAllowed();
subscribeLocalAIPrivacy(closeSentry);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
  { onCaughtError: handleRootCaughtError },
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

document.documentElement.dataset.buildVersion = buildVersion;
