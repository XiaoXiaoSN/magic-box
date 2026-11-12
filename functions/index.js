import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { isFeedbackSample } from './schema.js';
import { SubmissionError, storeFeedback } from './store.js';

initializeApp();

export const submitFeedback = onCall(
  {
    region: 'asia-east1',
    enforceAppCheck: true,
    maxInstances: 5,
    concurrency: 20,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    if (!request.auth)
      throw new HttpsError('unauthenticated', 'Sign in is required.');
    if (!isFeedbackSample(request.data)) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid or oversized feedback sample.',
      );
    }
    try {
      const receipt = await storeFeedback(
        getFirestore(),
        request.auth.uid,
        request.data,
      );
      return { receipt };
    } catch (error) {
      if (error instanceof SubmissionError) {
        throw new HttpsError(error.code, 'Feedback could not be accepted.');
      }
      // Do not pass SDK errors or request data to logs / client error details.
      throw new HttpsError(
        'internal',
        'Feedback could not be saved. Please retry.',
      );
    }
  },
);
