# Feedback collection for future machine learning

Enable **Settings → Privacy → Data collection mode** to reveal feedback forms
beneath the home screen's results. The mode is off by default and independent of
anonymous analytics. Nothing is uploaded until **Send feedback** is pressed.
The form supports both an explicitly confirmed result and an expected output
when the tools did not produce the desired answer (including zero matches).
Additional comments are optional. Switching off the mode prevents future sends;
an already dispatched request may finish. Previously accepted samples remain in
the central dataset.

The current input and **all** candidate outputs are submitted, not just the
chosen result. Review the example before sending and avoid personal data or
secrets. Previews, private `::ai` / `::localai` / `::secret` inputs, and pending
or stale results cannot be submitted. The existing sticky private-session gate
also hides feedback for the rest of a private session; reload to start a new one.
There is no automatic recording on focus, navigation, copy, or typing, and no
local feedback queue. A network failure can be retried from the same form with
the same sample ID.

## Storage decision

Use Firestore as the dataset store and a second generation callable Firebase
Function as the ingestion boundary. Sentry remains for operational errors:
its retention, sampling, and event size behavior do not provide a suitable
training dataset. Raw samples never go to Sentry, Analytics, or application logs.
The feedback Firebase initialization is separate from Analytics, and its SDKs
load only on an explicit submission. App Check may load reCAPTCHA for request
verification; the site key is public configuration, not an API secret.

`feedbackSamples/{receipt}` contains:

- `sample`: the exact versioned training example;
- `receivedAt`: trusted server receipt time;
- `ownerUid`: operational Firebase Auth UID, excluded from exports.

The receipt is SHA-256 of the UID and client sample UUID. An identical retry
returns the same receipt without another write or rate slot. A conflicting retry
is rejected. Each UID is limited to 20 new examples per UTC hour, transactionally.
`feedbackRateLimits/{uid}` stores that counter and its TTL time. Authentication is
in memory, so a reload starts a new anonymous session; this is basic abuse control,
not a global per-person quota. App Check and the function's instance cap complement
it. Consider a dedicated admission/quota service if abuse volume demands it.

## Deploy the central receiver

The existing Hosting workflow still deploys only Hosting. Deploy the receiver and
rules explicitly before enabling the web configuration. This repository does not
provision Firebase resources or change production settings automatically.

1. Select the existing `magic-box-b8bdc` project and enable billing (Functions v2
   needs the Blaze plan). Create its default Firestore database if absent; review
   its location before creation. The callable is in `asia-east1` (Taiwan).
2. Enable **Authentication → Sign-in method → Anonymous**. The app uses anonymous
   sign-in solely for feedback writes, with in-memory persistence.
3. Register the web app in **App Check** with a **reCAPTCHA v3** provider. Authorize
   the production domain and the preview/local domains used for verification.
   Keep callable enforcement enabled (`enforceAppCheck: true`). Local development
   can use Firebase's registered App Check debug tokens; never ship a debug token.
4. Install the receiver dependencies and validate:

   ```sh
   npm ci --prefix functions
   npm test --prefix functions
   ```

5. With a Firebase CLI identity allowed to deploy to this project:

   ```sh
   firebase deploy --project magic-box-b8bdc --only functions:feedback,firestore:rules,firestore:indexes
   ```

   The rules deny all browser access. The index configuration exempts the raw
   `sample` map and its children from indexing; exports use document IDs. Only the Admin SDK / IAM-authorized
   operators can read or write the dataset. Review these rules before deploying
   into a project shared with other Firestore applications.
6. Set `VITE_FIREBASE_APPCHECK_SITE_KEY` in local `.env`, or the GitHub repository
   variable **FIREBASE_APPCHECK_SITE_KEY** used by the shipping build, and rebuild
   Hosting. The callable name is `submitFeedback`. Without a site key the form
   displays a configuration notice and disables sending.
7. Optionally enable a Firestore TTL policy on `feedbackRateLimits.expiresAt`
   to clean old counters. Quotas reset independently of TTL cleanup.

If a different Firebase project or region is required, update `src/firebaseApp.ts`
and both region values in `functions/index.js` and
`src/features/feedback/transport.ts` before deployment. No admin credential belongs
in a `VITE_` variable. Limit dataset read/export IAM permissions to operators.

## Schema and export

`functions/schema.js` is the shared runtime validator, with browser types in
`functions/schema.d.ts`. Schema version 1 includes:

- `id`, `schemaVersion`, `consentVersion: "training-v1"`, client `createdAt`,
  `appVersion`, locale, IANA timezone, timezone mode and offset;
- raw `input`, including conversion directives;
- ordered `candidates`, each with a stable `sourceId`, sample-local candidate ID,
  name, exact plaintext `output`, and `isError`;
- `kind: "selection"`, with `selectedCandidateId` pointing at a non-error
  candidate, or `kind: "expectation"`, with required `expectedOutput` and a null
  selected candidate;
- optional `comment` (represented by an empty string when omitted).

The validator rejects unknown fields, duplicate candidate IDs, invalid selection
references, and oversized examples. Limits: 100 candidates, 32,768 UTF-16 code
units per input/output/expected output, 4,000 for comments, and 128 KiB UTF-8 total.
It **rejects** rather than truncates, preserving the integrity of training labels.
The candidate order is the order shown when the user sends; it is not a ranking
score. Use `kind` to distinguish preference labels from desired transformations.
Expected outputs are user suggestions and need curation before training.

For an export, use Application Default Credentials with Firestore read access
and explicitly name the project:

```sh
npm --prefix functions run export:feedback -- magic-box-b8bdc > feedback.jsonl
```

The script fetches 200 documents per page in document ID order and streams one
validated sample plus trusted `receivedAt` per JSONL line. It excludes `ownerUid`,
rate counters, and receipt IDs. Progress is written to stderr. A malformed stored
sample stops the export rather than silently producing incorrect training data.
Export during a quiescent period for a complete stable snapshot; live writes can
land before the pagination cursor. Keep raw exports private, deduplicate sample
IDs, review/remove sensitive examples, and split curated data before model use.
Samples are retained until an authorized operator deletes them; disabling the
client mode does not delete central records.

## Validation

Run `bun run test:feedback` for the shared schema and transaction/quota tests,
`bun run test --run` for UI/integration tests, and `bun run build`.

Before production rollout, verify against the configured Firebase project or a
Functions/Auth/Firestore emulator setup: unauthenticated calls rejected, missing
App Check rejected, browser Firestore read/write rejected, valid sample stored,
same sample retried once, and an IAM export containing no UID. Unit tests exercise
the data and transaction logic without Firebase services; they do not substitute
for App Check, IAM, or deployed integration verification.
