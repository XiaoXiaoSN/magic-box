import assert from 'node:assert/strict';
import { test } from 'node:test';
import { submitFeedback } from '../index.js';
import { sample } from './fixtures.mjs';

test('callable handler rejects unauthenticated and malformed submissions before database access', async () => {
  await assert.rejects(submitFeedback.run({ data: sample() }), {
    code: 'unauthenticated',
  });
  await assert.rejects(
    submitFeedback.run({
      auth: { uid: 'actor' },
      data: { ...sample(), schemaVersion: 999 },
    }),
    { code: 'invalid-argument' },
  );
});
