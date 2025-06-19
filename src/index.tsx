import React from 'react';

import CssBaseline from '@mui/material/CssBaseline';
import { init } from '@sentry/react';
import ReactDOM from 'react-dom/client';

import env from '@global/env';

import App from './App';
import './firebaseConfig';
import './index.css';

init({
  dsn: env.SENTRY_DSN,
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
