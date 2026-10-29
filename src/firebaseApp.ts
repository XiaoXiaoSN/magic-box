// Shared initialization has no analytics side effects. Feedback imports this
// module only after an explicit submission, even when analytics is disabled.
import { getApp, getApps, initializeApp } from 'firebase/app';

export const firebaseApp = getApps().some((app) => app.name === '[DEFAULT]')
  ? getApp()
  : initializeApp({
      apiKey: 'AIzaSyD5PZXqBNbQaBuD7udFJFTG0UBiZCjRYqo',
      authDomain: 'magic-box-b8bdc.firebaseapp.com',
      databaseURL: 'https://magic-box-b8bdc.firebaseio.com',
      projectId: 'magic-box-b8bdc',
      storageBucket: 'magic-box-b8bdc.appspot.com',
      messagingSenderId: '410691114194',
      appId: '1:410691114194:web:750542997e84e55a55890b',
      measurementId: 'G-TZWE035HK5',
    });
