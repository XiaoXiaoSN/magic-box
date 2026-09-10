# Experimental Local AI

Magic Box now has a separate Local AI mode next to the ordinary tools. It runs
short, single-turn ask / translate / rewrite / summarize tasks on the device.
Ordinary tools, BoxSource scheduling and the headless TUI are unchanged.

## Use

Open an HTTPS deployment, select **Local AI**, and enter a short request. Select
**Check device & model**, review the reported model file size, then explicitly
choose **Download / load model**. After warm-up succeeds, press **Run locally**.
Typing, changing task or switching locale never starts generation.

The selected model requires WebGPU **and shader-f16** inside a dedicated Worker.
An available adapter is not sufficient: a one-token warm-up must also succeed.
Unsupported devices keep their ordinary tools; there is no automatic CPU, larger
model, cloud-inference or agent/tool fallback. Mobile speed and memory use must
be measured on real devices before promoting this feature out of experimental.

Use **Stop** to cancel. Use **Release memory** to terminate the Worker while
keeping downloads. Backgrounding the page, navigating away or unmounting the
panel also releases the Worker. A completed answer remains complete when merely
releasing memory; cancelled output is explicitly partial. Returning requires
reloading the model, normally from cache. AI drafts exist only in page memory.

## Runtime and asset ownership

`src/features/local-ai/modelCatalog.ts` pins both dependencies:

- Transformers.js `4.2.0`, CDN **standalone** `dist/transformers.min.js`.
- `onnx-community/Qwen2.5-0.5B-Instruct`, revision
  `cc5cc01a65cc3ff17bdb73a7de33d879f62599b0`, `q4f16`, `webgpu`.

The standalone browser distribution intentionally replaces the proposed npm
installation for this first slice. It avoids native ONNX / sharp installation
and keeps the TUI dependency graph unchanged. Do not substitute
`dist/transformers.web.js`: that build leaves ONNX packages external and requires
a bundler. The runtime interface in `runtime.ts` is a narrow adapter to the
reviewed 4.2.0 API; it is not a substitute for a real-browser smoke test.

Inspection loads runtime code and model configuration/metadata, but does not
instantiate a tokenizer or model or request ONNX weights. ModelRegistry reports
the actual total of required model files; unknown sizes fail rather than
presenting a misleading estimate. The displayed size excludes additional ONNX
Runtime files. All model paths, including registry metadata discovery, are pinned
to the same revision. No user-controlled model IDs or runtime URLs are accepted.

Model/tokenizer files and the ONNX Runtime WASM/factory use a feature-specific
Transformers.js cache. Workbox caches only the pinned standalone entry module
under `magic-box-local-ai-runtime-v1`. Existing app precaching (including its
4 MiB limit) and the current versioned service-worker lifecycle remain intact.
Do not add hundreds of megabytes of weights to application precaching.

**Delete AI downloads** terminates this tab's Worker before deleting only these
two feature-owned caches. Close Local AI in other tabs first: another active tab
can repopulate shared origin caches. Persistence is requested best-effort after
download consent, not promised. Quota pressure/private browsing can make storage
unavailable; caching and allocation errors are recoverable through a new Worker.

This implementation does **not** claim offline readiness. Browser eviction,
first-use service-worker control and runtime module caching need a complete
close-page / disconnect / reopen / generate test. No `offline ready` flag is
persisted based solely on downloading weights.

## Boundaries and privacy

The AI draft never goes through `BoxSource`, option parsing, ordinary-tool
history or share-link creation. The normal and AI drafts are separate, so
switching back cannot accidentally submit an AI prompt to a network tool.
`?mode=local-ai` opens an empty private draft; `input` and `i` parameters are
ignored and removed in this mode. Copy/paste-back uses the current displayed
answer and stays in the AI draft. Rendering is plain text: no generated HTML,
remote images, executable links, tool calls or code execution.

Entering AI mode activates a document-lifetime telemetry gate *before* accepting
AI text. Direct AI visits activate it before SDK initialization. Sentry events,
transactions and breadcrumbs are dropped and an already-started client is
closed. Firebase initialization rechecks consent, and an existing collection
instance is disabled. The gate deliberately stays closed when switching back
to tools; re-enabling a preference must not flush private-session events.

This is local inference, **not zero networking**: first use contacts jsDelivr and
Hugging Face for runtime/model assets. Existing ordinary-tool requests that were
started before mode switching are not retroactively cancelled. No AI input or
answer is sent to an inference server or included in raw runtime error reports.

The complete chat template is capped at 1,024 tokens; the coarse input guard is
6,000 UTF-16 code units, and generation is capped at 256 new tokens. Oversized
input is rejected, not silently truncated. This small model is not a calculator,
fact checker or substitute for high-stakes professional advice.

## Execution protocol

`LocalAIPanel -> useLocalAI -> LocalAIClient -> inference.worker -> LocalAIEngine`

The client creates no Worker until explicit inspection. At most one operation
is admitted per Worker; session/runtime loading is single-flight. Every command
and event carries a request ID. Both Worker identity and the active ID must
match before a result changes UI state. Generation uses a submitted snapshot,
not the editable draft. The engine never downloads implicitly during generation.

Generation cancellation sets InterruptableStoppingCriteria outside the active
promise chain. The client immediately drops subsequent deltas. If no terminal
message arrives within two seconds, the client terminates the Worker. Inspection
and initialization cancellation terminate immediately. Operation deadlines are
60 seconds for inspection, ten minutes for loading and three minutes for a
single generation. They abort work rather than merely ignoring its result.

Input-validation failures retain the loaded model for a shorter retry. Runtime,
initialization, device, worker-message and timeout failures terminate the Worker
so poisoned ONNX initialization/execution chains cannot be reused. Only fixed
error codes cross the Worker boundary; raw exceptions are not logged.

## Validation

GPU-free core suite (Node 22 and TypeScript; uses the repository compiler when
installed, otherwise `tsc` on PATH):

```sh
node scripts/test-local-ai.cjs
```

This compiles the headless TypeScript modules into a fresh temporary directory,
runs 28 deterministic Node tests and removes only that temporary directory.
Tests cover stale workers/IDs, concurrency, snapshotting, cooperative and hard
cancellation, timeouts, recovery, warm-up disposal, metadata/consent boundaries,
token limits, capability checks and the sticky privacy gate. Model/runtime
implementations are mocked: these tests do not prove real GPU compatibility.
The same script is invoked by `src/features/local-ai/__tests__/core.test.ts` in
the existing Vitest suite.

With normal repository dependencies and WASM packages prepared:

```sh
bun run test --run src/features/local-ai/__tests__/core.test.ts src/pages/MagicBox/MagicBoxPage.test.tsx
bun run build
bun run lint
```

Page regressions cover separate drafts, missing AI history/share/QR controls,
no BoxSource mount in AI mode, no persistence after debounce, AI paste-back and
direct AI URLs. Full app validation also needs the existing WASM toolchain; do
not replace unavailable tooling with a claim that a build passed.

Before marking the PR ready, verify on a trusted HTTPS preview:

1. Android Chrome and iPhone Safari: inspect, consent, download, warm-up and a
   short Traditional Chinese question plus translation/rewrite/summary. Record
   device/OS/browser, first-use vs cached load, first-token time and total time.
2. Network recording: no ONNX weights before download consent, no prompt/answer
   in URLs, request bodies, analytics, history or Sentry; ordinary tools remain
   usable on unsupported devices.
3. Stop during download and generation, double taps, edit while generating,
   background/foreground, and switch to tools. No old output may enter a later
   request and no worker may keep running after release/unmount.
4. Forced load failure and quota denial: clear error, recreate Worker and retry.
   Delete downloads with other AI tabs closed; ordinary settings/cache survive.
5. Fully close the page, disconnect networking, reopen and generate. Record the
   result rather than inferring it from a cache badge. Test refresh/PWA updates
   separately to protect the existing service-worker update flow.

## Upgrades and rollback

Upgrade the runtime adapter, pinned CDN URL, matching Workbox route and cache
version together; check upstream build outputs rather than guessing file names.
Upgrade the model revision and verify its file sizes, license, dtype and token
limits together. Re-run protocol, page and real-device smoke tests. New versions
use a separate model cache; legacy-cache cleanup is a follow-up before repeatedly
shipping model versions. Multi-tab model coordination, model selection, command
parsing and model-to-tool execution are explicitly outside this first slice.

Rollback by reverting this feature commit and deploying the previous app.
Existing tool settings/history require no migration. Previously downloaded AI
cache data is inert; clear it through this version's button before rollback or
through the browser's site-data controls afterwards.

Primary API references reviewed at tag `4.2.0`:

- https://github.com/huggingface/transformers.js/blob/4.2.0/packages/transformers/scripts/build/targets.mjs
- https://github.com/huggingface/transformers.js/blob/4.2.0/packages/transformers/scripts/build/constants.mjs
- https://github.com/huggingface/transformers.js/blob/4.2.0/packages/transformers/src/utils/model_registry/ModelRegistry.js
- https://github.com/huggingface/transformers.js/blob/4.2.0/packages/transformers/src/tokenization_utils.js
- https://github.com/huggingface/transformers.js/blob/4.2.0/packages/transformers/src/env.js
- https://huggingface.co/docs/transformers.js/en/installation
