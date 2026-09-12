# Local AI (experimental)

On-device text generation for Magic Box: ask, translate, rewrite and summarize a
short passage with a small language model that runs in the browser over WebGPU.
No inference server, no API key, no cloud or CPU fallback.

This document is the contract for the feature. If you change the worker protocol,
the pinned runtime or the privacy gate, update it here first.

## Entry point

The feature is a BoxSource (`src/modules/boxSources/LocalAIBoxSource.ts`), not a
separate page mode. It is enabled by default but **option-gated**, exactly like
`::roll`:

- `::ai` or `::localai` on the home screen renders the panel.
- `/list` shows it as an ordinary tool (its `defaultInput` is `::ai`), so the box
  is selectable and testable there like every other box.
- Settings can reorder or disable it.

`generateBoxes` is synchronous and pure — one `hasOptionKeys` check, no
capability probe, no fetch, no worker. Typing ordinary text therefore cannot
surface a box that downloads half a gigabyte, and the AI request never joins
MagicBox's per-keystroke `Promise.all`.

The panel owns its own in-memory draft. The magic input only ever holds `::ai`,
so a prompt cannot leak into search history, the `?input=` share link or option
parsing.

## Explicit steps

Nothing happens implicitly. Each step needs its own click:

1. **Check device & model** — probes HTTPS, a WebGPU adapter and `shader-f16`
   inside the worker, then reads the registry metadata for the pinned revision
   and reports the real total byte size. Requests no weights.
2. **Consent checkbox + Download / load model** — fetches the runtime and the
   weights, then runs a one-token warm-up. Only a successful warm-up reports
   `ready`: an adapter is not proof that the model can execute.
3. **Run locally** — one generation at a time.

Typing, switching task or changing locale never starts inference, and generation
never implicitly downloads a model (`generate` without a session is a `load`
error).

## Pins

| What | Value | Why |
| --- | --- | --- |
| Runtime | `@huggingface/transformers@4.2.0/dist/transformers.min.js` from jsDelivr | The standalone bundle. `dist/transformers.web.js` keeps an external ONNX dependency, and the package root can resolve an entry that drags native onnxruntime/sharp into the graph. Loaded with a dynamic `import()` inside the worker, so no npm or lockfile dependency is added. |
| Model | `onnx-community/Qwen2.5-0.5B-Instruct`, revision `cc5cc01a…`, dtype `q4f16` | ~483 MiB, Apache-2.0, fits a phone GPU. |
| Prompt budget | 6,000 chars / 1,024 tokens of the rendered chat template | Rejected, never silently truncated. |
| Output budget | 256 new tokens, `do_sample: false` | Deterministic and bounded. |

`loadRuntime` asserts `env.version === '4.2.0'` so an unexpected CDN payload
becomes a load error instead of a half-initialized engine.

### Caches

| Cache | Contents |
| --- | --- |
| `magic-box-local-ai-<runtime>-<revision>-<dtype>` | model weights and the ORT wasm/factory files |
| `magic-box-local-ai-runtime-v1` | the pinned runtime module (Workbox `CacheFirst`) |

The model cache key carries the runtime version, model revision and dtype, so
bumping a pin cannot serve stale artifacts. **Delete AI downloads** removes only
these two caches — never Workbox's app caches, and never another feature's
storage. Close Local AI in other tabs first: another tab can repopulate a shared
cache while this one deletes it.

Workbox's 4 MiB `maximumFileSizeToCacheInBytes` precache budget is untouched;
weights never enter the app cache.

## Lifecycle contract

`LocalAIClient` (main thread) owns the worker; `LocalAIEngine` (worker) owns the
model. Two independent guards must both pass before an event is accepted: the
request id **and** the worker identity captured in the `onmessage` closure. A
terminated worker's queued message can never revive a stale phase.

- **One model, one operation.** The engine admits a single command; the client
  rejects duplicate submissions before they are posted.
- **Single-flight load.** `runtimePromise` and `sessionPromise` are memoized, and
  a rejection clears them so a retry starts clean instead of re-awaiting a
  rejected promise.
- **Request snapshot.** `generate` copies the request, so editing the draft
  mid-generation cannot change what was submitted or what the answer is
  attributed to.
- **Stop.** During generation the client sends `cancel` first — a cooperative
  `InterruptableStoppingCriteria` keeps the loaded model warm — and terminates
  the worker if it has not settled within 2 s. During download or initialization,
  stop terminates immediately, because a blocked ORT init never yields.
  Post-cancel deltas are dropped, and a completion that raced with the cancel is
  still reported as `stopped`/incomplete.
- **Timeouts.** 60 s inspect, 10 min load, 3 min generate. A timeout terminates
  the worker and is retryable.
- **Failure.** Any non-recoverable error terminates the worker. `inputLimit` and
  `invalidRequest` are recoverable: the loaded model stays usable for a shorter
  prompt.
- **Memory.** The worker is released on `visibilitychange` (hidden), on
  `pagehide`, on unmount, and on **Release memory**. A backgrounded tab holding
  ~500 MB of GPU memory is the usual cause of allocation failures elsewhere.

## Privacy

- Prompts and answers live in component state only. They do not pass through
  BoxSources, search history, share links or option parsing.
- `src/functions/localAIPrivacy.ts` holds a **sticky** flag. It is set when the
  panel mounts, and before the Sentry/Firebase SDKs are constructed when the URL
  already carries `::ai`. It only ever closes: re-enabling telemetry on the way
  out could flush breadcrumbs collected while a private prompt was on screen.
- The gate is folded into `isAnalyticsEnabled()` rather than repeated at each
  call site, so every consumer inherits it — Sentry `enabled`/`beforeSend`/
  `beforeBreadcrumb`/`beforeSendTransaction`, the lazy `firebaseConfig` import,
  and `setAnalyticsCollectionEnabled` on an SDK that already exists.
- `sendDefaultPii` is off and Sentry log forwarding is disabled. Worker failures
  cross the boundary as fixed error codes only; raw exceptions (which can embed
  user text) are never forwarded, logged or rendered.
- Output renders as text. No HTML, no remote images, no executable links, and the
  system prompt tells the model to treat user text as content rather than
  permission to run tools.
- "Local inference" is not "no network": the runtime and weights come from
  jsDelivr and Hugging Face on first load.

## Box integration

The panel publishes only **settled** text to the host (`onOutput` → the
template's `onResultChange`), so the card's Copy button and the Enter shortcut
operate on the real answer while streaming stays local to the panel. Publishing
every token would re-render the whole box list per token.

The box sets `showExpandButton: false`: re-mounting a stateful panel inside the
modal would drop the loaded model and the in-flight draft.

The source is excluded from `src/tui/sources.ts` — its template pulls in React
and a module worker, so it is not node-safe.

## Verification

Automated (`bun run test`):

- `src/features/local-ai/__test__/core.test.ts` — client ownership, worker
  isolation, cancellation, timeouts, recoverable vs fatal errors, prompt
  construction, bounds, capability checks.
- `src/features/local-ai/__test__/engine.test.ts` — metadata-only inspection,
  single-flight load, warm-up failure handling, streaming and output budget,
  over-budget rejection, cancel delivery, quota mapping.
- `src/features/local-ai/__test__/LocalAIPanel.test.tsx` — consent gating, the
  measured size, run preconditions, streaming, settled-output publishing,
  sanitized errors.
- `src/modules/boxSources/__test__/LocalAIBoxSource.test.ts` — option gating and
  registration.
- `src/pages/ToolsList/ToolsList.test.tsx` — the box is listed on `/list`, its
  panel mounts, and it spawns no worker just by being on screen.

These inject a fake worker and a fake runtime. **No test downloads a model or
runs real GPU inference.**

Still required before this leaves experimental:

- [ ] HTTPS runs on a real Android/Chrome and iPhone/Safari device: first load,
      cached reload, all four tasks, speed and memory.
- [ ] Stop during download and during generation; double clicks; editing while
      generating; background/foreground; leaving the box; retry after failure.
- [ ] Network and storage inspection: no weights before consent; no prompt or
      answer in any request body, URL, history entry or telemetry payload.
- [ ] Unsupported GPU and insufficient storage recovery paths.
- [ ] Offline cold start is **not** claimed. Cached weights are not proof that
      the runtime, service worker and a disconnected reload work.

## Rollback

Disable the box in Settings to hide it for a user. To remove the feature, delete
`LocalAIBoxSource` from `src/modules/boxSources/index.ts`; the panel and worker
are lazy, so nothing else ships. The telemetry hardening in
`src/functions/runtimePrefs.ts`, `src/index.tsx` and `src/firebaseConfig.ts` is
independently useful and can stay.

## Out of scope

Additional models, automatic model selection, conversation memory, cross-tab
coordination, self-hosting the runtime, verified offline readiness, and letting
the model drive tools.
