import './index.css';
import './firebaseConfig';

import env from '@global/env';
import CssBaseline from '@mui/material/CssBaseline';
import * as Sentry from '@sentry/react';
import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';

Sentry.init({
  dsn: env.SENTRY_DSN,
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
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
