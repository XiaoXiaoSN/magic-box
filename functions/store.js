import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

export class SubmissionError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

// A fixed document ID makes network retries idempotent. UID is operational
// metadata only; export-feedback deliberately projects only the sample.
export async function storeFeedback(db, uid, sample, now = new Date()) {
  const receipt = createHash('sha256')
    .update(`${uid}\0${sample.id}`)
    .digest('hex');
  const sampleRef = db.collection('feedbackSamples').doc(receipt);
  const rateRef = db.collection('feedbackRateLimits').doc(uid);
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(sampleRef);
    if (existing.exists) {
      if (!isDeepStrictEqual(existing.data().sample, sample)) {
        throw new SubmissionError('already-exists');
      }
      return;
    }
    const rate = (await transaction.get(rateRef)).data();
    const hour = Math.floor(now.getTime() / 3_600_000);
    const count = rate?.hour === hour ? rate.count : 0;
    if (count >= 20) throw new SubmissionError('resource-exhausted');
    transaction.create(sampleRef, {
      sample,
      ownerUid: uid,
      receivedAt: now,
    });
    transaction.set(rateRef, {
      hour,
      count: count + 1,
      expiresAt: new Date(now.getTime() + 24 * 3_600_000),
    });
  });
  return receipt;
}
