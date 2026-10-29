import assert from 'node:assert/strict';
import { test } from 'node:test';
import { storeFeedback } from '../store.js';
import { sample } from './fixtures.mjs';

// Implements the transaction boundary in memory; real concurrent transaction
// retries and IAM/App Check are verified with the Firebase emulator/deployment.
function database() {
  const documents = new Map();
  return {
    documents,
    collection: (collection) => ({ doc: (id) => `${collection}/${id}` }),
    async runTransaction(callback) {
      const writes = [];
      await callback({
        get: async (ref) => ({
          exists: documents.has(ref),
          data: () => documents.get(ref),
        }),
        create: (ref, value) => writes.push([ref, value]),
        set: (ref, value) => writes.push([ref, value]),
      });
      for (const [ref, value] of writes) documents.set(ref, value);
    },
  };
}

test('same sample retry has a stable receipt and does not consume another rate slot', async () => {
  const db = database();
  const receipt = await storeFeedback(db, 'actor', sample());
  // Firestore reorders map fields, so equality must be independent of key order.
  const reordered = Object.fromEntries(Object.entries(sample()).reverse());
  assert.equal(await storeFeedback(db, 'actor', reordered), receipt);
  assert.equal(db.documents.size, 2);
  assert.equal(db.documents.get('feedbackRateLimits/actor').count, 1);
  await assert.rejects(
    storeFeedback(db, 'actor', { ...sample(), comment: 'different' }),
    { code: 'already-exists' },
  );
  assert.notEqual(await storeFeedback(db, 'other', sample()), receipt);
});

test('hourly quota rejects the 21st new sample, allows retries, then resets', async () => {
  const db = database();
  const now = new Date('2026-10-29T08:00:00Z');
  for (let i = 0; i < 20; i++)
    await storeFeedback(db, 'actor', { ...sample(), id: String(i) }, now);
  await assert.rejects(storeFeedback(db, 'actor', sample(), now), {
    code: 'resource-exhausted',
  });
  await storeFeedback(db, 'actor', { ...sample(), id: '0' }, now);
  await storeFeedback(db, 'actor', sample(), new Date('2026-10-29T09:00:00Z'));
  assert.equal(db.documents.get('feedbackRateLimits/actor').count, 1);
});
