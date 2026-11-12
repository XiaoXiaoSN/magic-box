import { isLocalAIPrivate, isPrivateInput } from '@functions/localAIPrivacy';
import {
  type FeedbackSample,
  isFeedbackSample,
} from '../../../functions/schema.js';

export class FeedbackError extends Error {
  constructor(
    public readonly reason: 'unconfigured' | 'invalid' | 'cancelled',
  ) {
    super(reason);
  }
}

export const isFeedbackConfigured = (): boolean =>
  Boolean(import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY?.trim());

export async function submitFeedback(
  sample: FeedbackSample,
  isAllowed: () => boolean,
): Promise<void> {
  const isAllowedNow = () => isAllowed() && !isLocalAIPrivate();
  if (!isAllowedNow()) throw new FeedbackError('cancelled');
  if (isPrivateInput(sample.input) || !isFeedbackSample(sample)) {
    throw new FeedbackError('invalid');
  }
  if (!isFeedbackConfigured()) throw new FeedbackError('unconfigured');
  const { sendFeedback } = await import('./transport');
  if (!isAllowedNow()) throw new FeedbackError('cancelled');
  await sendFeedback(sample, isAllowedNow);
}
