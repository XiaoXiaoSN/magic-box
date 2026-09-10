// Import the functions you need from the SDKs you need
import { getAnalytics, setAnalyticsCollectionEnabled } from 'firebase/analytics';
import { isAnalyticsEnabled, subscribeAnalyticsPermission } from './functions/runtimePrefs';
import { initializeApp } from 'firebase/app';

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
// Recheck at module evaluation too: preference/AI mode can change while this
// module is being downloaded. Keep an existing SDK disabled after opt-out.
const analytics = isAnalyticsEnabled() ? getAnalytics(app) : null;
if (analytics) {
  subscribeAnalyticsPermission((enabled) => {
    setAnalyticsCollectionEnabled(analytics, enabled);
  });
}

export default { app, analytics };
