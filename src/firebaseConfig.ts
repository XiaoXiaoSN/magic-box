// Import the functions you need from the SDKs you need
import {
  type Analytics,
  getAnalytics,
  setAnalyticsCollectionEnabled,
} from 'firebase/analytics';
import { firebaseApp as app } from './firebaseApp';

import { subscribeAnalyticsPermission } from './functions/runtimePrefs';

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
