// Import the functions you need from the SDKs you need
import {
  type Analytics,
  getAnalytics,
  setAnalyticsCollectionEnabled,
} from 'firebase/analytics';
import { initializeApp } from 'firebase/app';

import { subscribeAnalyticsPermission } from './functions/runtimePrefs';

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
// The preference or the local AI gate can change while this chunk is still
// downloading, so analytics is created on the first allowed moment rather than
// at module evaluation, and follows every later change from then on.
let analytics: Analytics | null = null;
subscribeAnalyticsPermission((enabled) => {
  if (enabled && !analytics) analytics = getAnalytics(app);
  if (analytics) setAnalyticsCollectionEnabled(analytics, enabled);
});

export default {
  app,
  get analytics() {
    return analytics;
  },
};
