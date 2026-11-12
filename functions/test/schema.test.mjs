import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isFeedbackSample, MAX_CANDIDATES } from '../schema.js';
import { sample } from './fixtures.mjs';

test('accepts selection labels and expectations without any candidate', () => {
  assert.equal(isFeedbackSample(sample()), true);
  assert.equal(
    isFeedbackSample({
      ...sample(),
      kind: 'expectation',
      candidates: [],
      selectedCandidateId: null,
      expectedOutput: 'some result',
    }),
    true,
  );
});

test('rejects absent labels, error selections, invalid IDs, and unknown fields', () => {
  for (const patch of [
    { selectedCandidateId: 'missing' },
    { selectedCandidateId: null },
    { kind: 'expectation', expectedOutput: '  ' },
    { id: '../../path' },
    { createdAt: 'yesterday' },
    { consentVersion: null },
    { ownerUid: 'spoofed' },
    { candidates: [{ ...sample().candidates[0], isError: true }] },
    { candidates: [{ ...sample().candidates[0], extra: 'unsupported' }] },
    { candidates: [sample().candidates[0], sample().candidates[0]] },
    { timezoneOffset: Infinity },
    { timezoneOffset: -20 },
    { locale: 'unknown' },
  ])
    assert.equal(
      isFeedbackSample({ ...sample(), ...patch }),
      false,
      JSON.stringify(patch),
    );
});

test('limits UTF-8 bytes as well as character and candidate counts without truncation', () => {
  assert.equal(
    isFeedbackSample({ ...sample(), input: 'a'.repeat(32769) }),
    false,
  );
  assert.equal(
    isFeedbackSample({ ...sample(), comment: 'a'.repeat(4001) }),
    false,
  );
  assert.equal(
    isFeedbackSample({
      ...sample(),
      candidates: Array.from({ length: MAX_CANDIDATES + 1 }, (_, i) => ({
        ...sample().candidates[0],
        id: String(i),
      })),
    }),
    false,
  );
  // Each text field is within its individual limit, but the total exceeds 128 KiB.
  assert.equal(
    isFeedbackSample({
      ...sample(),
      kind: 'expectation',
      selectedCandidateId: null,
      input: '字'.repeat(32768),
      expectedOutput: '字'.repeat(32768),
    }),
    false,
  );
});
