import React from 'react';

import CssBaseline from '@mui/material/CssBaseline';
import { browserTracingIntegration, init } from '@sentry/react';
import ReactDOM from 'react-dom/client';

import { buildVersion } from '@global/buildInfo';
import env from '@global/env';

import App from './App';
import './firebaseConfig';
import './index.css';

init({
  dsn: env.SENTRY_DSN,

  integrations: [browserTracingIntegration()],

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  // Set `tracePropagationTargets` to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: ["localhost", /^https:\/\/mb\.10oz\.tw/],

  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
  // Enable logs to be sent to Sentry
  _experiments: { enableLogs: true },
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
    <CssBaseline />
    <App />
  </React.StrictMode>
);

document.documentElement.dataset.buildVersion = buildVersion;
