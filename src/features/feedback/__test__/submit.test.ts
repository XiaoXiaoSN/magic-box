import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FeedbackSample } from '../../../../functions/schema.js';
import { submitFeedback } from '../submit';

const { sendFeedback } = vi.hoisted(() => ({ sendFeedback: vi.fn() }));
vi.mock('../transport', () => ({ sendFeedback }));
const sample = (): FeedbackSample => ({
  schemaVersion: 1,
  consentVersion: 'training-v1',
  id: '8f984c03-0d3c-4ca4-a3ab-2875014a280c',
  createdAt: '2026-10-29T08:00:00.000Z',
  appVersion: 'test',
  locale: 'en',
  timezoneMode: 'fixed',
  timezone: 'Asia/Taipei',
  timezoneOffset: 8,
  input: 'unhandled',
  candidates: [],
  selectedCandidateId: null,
  expectedOutput: 'wanted output',
  comment: '',
  kind: 'expectation',
});

beforeEach(() => {
  sendFeedback.mockReset().mockResolvedValue(undefined);
  vi.stubEnv('VITE_FIREBASE_APPCHECK_SITE_KEY', 'public-site-key');
});

describe('feedback upload boundary', () => {
  it('fails closed when the deployment is unconfigured or permission is absent', async () => {
    await expect(submitFeedback(sample(), () => false)).rejects.toMatchObject({
      reason: 'cancelled',
    });
    vi.stubEnv('VITE_FIREBASE_APPCHECK_SITE_KEY', '');
    await expect(submitFeedback(sample(), () => true)).rejects.toMatchObject({
      reason: 'unconfigured',
    });
    expect(sendFeedback).not.toHaveBeenCalled();
  });

  it.each([
    '::ai',
    '::localai',
    '::secret',
    '::SECRET=true',
  ])('rejects private directives %s before SDK initialization', async (directive) => {
    await expect(
      submitFeedback(
        { ...sample(), input: `private\n${directive}` },
        () => true,
      ),
    ).rejects.toMatchObject({ reason: 'invalid' });
    expect(sendFeedback).not.toHaveBeenCalled();
  });

  it('rechecks permission after the lazy transport resolves', async () => {
    let allowed = true;
    const pending = submitFeedback(sample(), () => allowed);
    allowed = false;
    await expect(pending).rejects.toMatchObject({ reason: 'cancelled' });
    expect(sendFeedback).not.toHaveBeenCalled();
  });

  it('forwards the validated immutable snapshot with a live permission check', async () => {
    const example = sample();
    const allowed = () => true;
    await submitFeedback(example, allowed);
    expect(sendFeedback).toHaveBeenCalledWith(example, expect.any(Function));
  });
});
