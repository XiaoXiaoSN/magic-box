import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import {
  getAuth,
  inMemoryPersistence,
  setPersistence,
  signInAnonymously,
} from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { FeedbackSample } from '../../../functions/schema.js';
import { firebaseApp } from '../../firebaseApp';
import { FeedbackError } from './submit';

let appCheckStarted = false;
let authReady: Promise<void> | null = null;

export async function sendFeedback(
  sample: FeedbackSample,
  isAllowed: () => boolean,
): Promise<void> {
  if (!isAllowed()) throw new FeedbackError('cancelled');
  if (!appCheckStarted) {
    initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaV3Provider(
        import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY,
      ),
      isTokenAutoRefreshEnabled: false,
    });
    appCheckStarted = true;
  }
  const auth = getAuth(firebaseApp);
  if (authReady === null) {
    authReady = (async () => {
      // No persistent identifier in the browser. Auth is used only to protect
      // dataset writes, independently of the analytics preference.
      await setPersistence(auth, inMemoryPersistence);
      if (!isAllowed()) throw new FeedbackError('cancelled');
      if (!auth.currentUser) await signInAnonymously(auth);
    })().catch((error: unknown) => {
      authReady = null;
      throw error;
    });
  }
  await authReady;
  if (!isAllowed()) throw new FeedbackError('cancelled');
  const callable = httpsCallable<FeedbackSample, { receipt: string }>(
    getFunctions(firebaseApp, 'asia-east1'),
    'submitFeedback',
    { timeout: 30_000 },
  );
  await callable(sample);
}
