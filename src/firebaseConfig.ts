// Import the functions you need from the SDKs you need
import {
  getAnalytics,
  setAnalyticsCollectionEnabled,
} from 'firebase/analytics';
import { initializeApp } from 'firebase/app';

import {
  isAnalyticsEnabled,
  subscribeAnalyticsPermission,
} from './functions/runtimePrefs';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyD5PZXqBNbQaBuD7udFJFTG0UBiZCjRYqo',
  authDomain: 'magic-box-b8bdc.firebaseapp.com',
  databaseURL: 'https://magic-box-b8bdc.firebaseio.com',
  projectId: 'magic-box-b8bdc',
  storageBucket: 'magic-box-b8bdc.appspot.com',
  messagingSenderId: '410691114194',
  appId: '1:410691114194:web:750542997e84e55a55890b',
  measurementId: 'G-TZWE035HK5',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Re-check at module evaluation: the preference or the local AI gate can change
// while this chunk is still downloading. Once an SDK exists, follow later
// changes instead of leaving collection on.
const analytics = isAnalyticsEnabled() ? getAnalytics(app) : null;
if (analytics) {
  subscribeAnalyticsPermission((enabled) => {
    setAnalyticsCollectionEnabled(analytics, enabled);
  });
}

export default { app, analytics };
