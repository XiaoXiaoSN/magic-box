import { once } from 'node:events';
import { initializeApp } from 'firebase-admin/app';
import { FieldPath, getFirestore } from 'firebase-admin/firestore';
import { isFeedbackSample } from './schema.js';

// Uses Application Default Credentials. Explicit project selection avoids
// accidentally exporting a different project from the operator's CLI profile.
const projectId = process.argv[2];
if (!projectId)
  throw new Error(
    'Usage: npm run export:feedback -- PROJECT_ID > feedback.jsonl',
  );
initializeApp({ projectId });
const db = getFirestore();
let cursor;
let count = 0;
for (;;) {
  let query = db
    .collection('feedbackSamples')
    .orderBy(FieldPath.documentId())
    .limit(200);
  if (cursor) query = query.startAfter(cursor);
  const page = await query.get();
  if (page.empty) break;
  for (const document of page.docs) {
    const { sample, receivedAt } = document.data();
    if (!isFeedbackSample(sample))
      throw new Error(`Invalid sample: ${document.id}`);
    const line = JSON.stringify({
      ...sample,
      receivedAt: receivedAt.toDate().toISOString(),
    });
    if (!process.stdout.write(`${line}\n`)) await once(process.stdout, 'drain');
    count += 1;
  }
  cursor = page.docs.at(-1);
}
process.stderr.write(`Exported ${count} samples.\n`);
