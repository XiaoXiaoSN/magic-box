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

The prompt can come from either side:

- `::ai` alone — the panel shows its own textarea and owns the draft in memory.
- `say hello\n::ai` — the text in front of the directive travels with the box as
  `BoxProps.sourceInput`, the panel drops its textarea, and the magic input is
  the single place that prompt is edited.
- `::ai what is WebGPU?` — text after the directive on the same line is the
  prompt too. `parseInput` reads it as the option value and strips the line, so
  the BoxSource joins it onto `sourceInput`; before that it was silently dropped.

`sourceInput` is a generic part of the Box contract (the input a box was built
from, `::option` directives already stripped), not an AI-specific channel.

A prompt in the magic input would otherwise be recorded like any other search,
so `MagicBoxPage` skips `addEntry` for any input `isLocalAIInput` matches.
Skipping the final input alone is not enough: the prompt is typed *before* the
directive, and every pause past the 500 ms debounce settles on an ordinary
partial input (`my question`, `my question\n::`, `…::a`) that was recorded. So
when an `::ai` input settles, the page also withdraws the entries its current
edit session created — since the input was last empty or replaced wholesale —
and leaves alone entries that already existed and were only moved to the top.
It also closes the telemetry gate at that moment, not when the lazy panel chunk
mounts. Option parsing still sees only the directives, and the `?input=` share link is
the one place the text can still travel — the user has to press Share for that,
and the box says so while a carried prompt is in use.

## Surfaces

Three surfaces, and no two of them do the same job:

- **The box** — acts. One primary button that performs the next step, Stop while
  something is in flight, the prompt, the answer. Plus the gear.
- **AI settings dialog** (the gear) — configures. Task, output language,
  auto-run, releasing the loaded model, the model readout, and the long-form privacy, caution and limitation notes. It has no
  setup button: the box's button is the setup button.
- **Settings → Local AI** — provisions. The same preferences, plus the same step
  button so the weights can be fetched ahead of time with no box open, and
  **Delete AI downloads**.

An earlier revision had a **Set up model** button in the box that only opened
the dialog, where the real controls were. Two controls, one function, and the
task button was a dead end. The button now does the work, which is what makes
the split above hold.

Both configuration surfaces read and write `Prefs.ai*` in `PreferencesContext`,
so a choice made in one is already in force in the other. `aiLanguage` stores
`auto` and is resolved against the app locale at request time, never at write
time.

### One step per click

`describeSetupStep(state, locale)` in `setupStep.ts` is the
single definition of what comes next. The box and the settings page both render
from it, so one action can never carry two names, and the size a user commits to
is the size they were shown.

| state | button | note under it |
| --- | --- | --- |
| no device/cache check yet | `Check device & model` | — |
| device supported, not cached | `Download model · 467.3 MiB` | the sources: jsDelivr and Hugging Face |
| device supported, cached | `Load model · 467.3 MiB` | "found in the cache" |
| loaded | `Run locally` | — |

The quoted size is the exact byte count pinned alongside the immutable model
revision and dtype (`MODEL.downloadBytes`). The check never probes Hub files
just to learn their size; when the model pin changes, this byte count must be
updated from that same revision.

> **On the size.** Earlier revisions of these docs said `~483 MiB`, which was
> wrong twice. `483,003,582` is the exact *byte* count of `onnx/model_q4f16.onnx`
> at the pinned revision — that is 460.6 MiB (483.0 MB), so the number had been
> read off as MiB when it was really bytes-as-MB. It also omitted
> `tokenizer.json` (6.7 MiB), which the pipeline does fetch. The real total the
> app downloads is `490,035,255` bytes = **467.3 MiB**, which is what
> `describeSetupStep` quotes and what the test fixtures now use.

### Checking on open

`useLocalAI({ autoInspect })` runs step 1 once on mount, so the box opens already
on `Download model · <size>` — or `Load model · <size>` when the files are
cached. Reaching the box means typing `::ai` or picking Local AI from `/list`;
"can this device run it, and how big is it" is a question the user has already
asked, so charging a click to answer it bought nothing.

What the check costs is worth stating exactly: the small pinned runtime from
jsDelivr, a WebGPU adapter probe, and a local CacheStorage inspection. It makes
no Hugging Face model-file request and fetches zero weights. The 467.3 MiB stays
behind the size-labelled button, always, on every visit.

`prefs.aiAutoCheck` (default **on**) is the off-switch, in Settings → Local AI
only, for anyone who does not want a mounted box contacting jsDelivr by itself. With it off, the box falls back to the explicit `Check device & model`
button — the same state machine, one extra click.

Three places deliberately do **not** check themselves open:

- **`/list` previews.** The catalog mounts the real box so the demonstration
  cannot drift from the tool, which would make browsing the shelf reach the
  network. `BoxPreviewProvider` marks that subtree and `LocalAIPanel` reads it
  (`useIsBoxPreview`). It is a context and not a Box-contract prop because it is
  a property of the surrounding surface, not of the box. The same reading keeps
  the sticky telemetry gate open in a preview until it is actually used — a
  typed or carried prompt, or a setup click — so browsing the list does not
  switch error reporting off for the rest of the visit.
- **Settings → Local AI.** That section renders for everyone who opens Settings,
  so its presence is not a request to use local AI. It keeps the manual check.
- **A failed check, or a known answer.** The effect runs once per mount and
  only from a blank client (`phase: 'idle'`, no `info`). The client is shared
  (see *Lifecycle*), so a remount must not re-check a size it already knows, and
  a failure leaves `phase: 'error'`, which an automatic network retry loop must
  not re-enter. Retrying is the button's job.

The check does not lock the draft textarea: only a running generation does. A
minute-long check on a slow link used to disable the one field the user needed.

The check also renders no `Stop` button (`busy && phase !== 'inspecting'`). The
user pressed nothing, so there is nothing of theirs to abort; `Stop` belongs to
the download and the generation.

## Explicit steps

Each setup step still needs its own click:

1. **Check device & model** — probes HTTPS, a WebGPU adapter and `shader-f16`
   inside the worker, loads the pinned runtime, checks the local model cache and
   reports the exact byte size pinned with the model revision. It makes no
   Hugging Face model-file request and requests no weights.
2. **Download model · <size>** — fetches the runtime and the weights, then runs
   a one-token warm-up. Only a successful warm-up reports `ready`: an adapter is
   not proof that the model can execute.
3. **Run locally** — one generation at a time.

### Consent

The click on step 2 **is** the consent: its label carries the exact pinned byte
count and the note under it names jsDelivr and Hugging Face. That is a stronger,
better-informed act than ticking a box that says a download may happen later.

There is no stored download permission, by design. A checkbox answered once, for
reasons the user no longer has in front of them, is weaker than a labelled button
pressed at the moment bytes move — and a feature asking permission to do the
thing it was just opened to do is consent theatre. So `describeSetupStep` takes
no permission argument: the source note is attached to the action and shows every
time a download is the next step, replaced by `cached` when the click will fetch
nothing.

`prefs.aiAutoCheck` is **not** that permission. It governs the device/cache check
only, and no code path downloads weights without a click on that button.

### What the dialog shows by default

The gear dialog answers four questions on open — which model, is it loaded, does
text leave the device, and what can I change — and nothing else. Two `<details>`
disclosures hold the rest:

| default view | `Model details` | `Technical details` |
| --- | --- | --- |
| name · dtype | what opening the box reads | WebGPU / `shader-f16`, no fallback |
| load state (dot + phase) | jsDelivr and Hugging Face as sources | token budgets, single turn |
| error text, when there is one | cache eviction is not an offline guarantee | GPU released on background |
| "Runs in this browser…" | license, model card link | telemetry stays off this visit |
| exact pinned download size | | |

Four rules produced that split, and they are worth keeping:

1. **Error conditions are shown when they happen, not in advance.** "Long input
   is rejected" was permanent copy for a state that already renders
   `errors.inputLimit` at the moment it occurs.
2. **The size is exact and pinned, not advised.** `runtimeExtra` said "use Wi-Fi",
   which is someone else's judgement about the user's connection. Once `state.info`
   exists the dialog says `First use downloads 467.3 MiB` and lets them make it.
3. **Sources are named where consent is given, not everywhere.** The box's step
   note under `Download model · <size>` names jsDelivr and Hugging Face at the
   click that fetches them. Repeating it in the dialog — next to "model
   setup metadata, not model weights" — mostly raised the question "then where do the
   weights come from?" without a decision attached. It moved to `Model details`.
4. **A preference is not a question.** The dialog carries no permission
   checkbox. The only switch that survives, `aiAutoCheck`, lives in Settings
   where preferences live, defaults on, and describes what it does rather than
   asking to be allowed.

Two things deliberately did **not** move:

- **The share-link note.** In host-prompt mode the text really is in the main
  input, so the other tools match it and a share link carries it. It only
  renders in that mode. Announcing it at the Share button would be better, but
  `ShareLink` has no knowledge of AI mode, so until it does this is the only
  place a user can learn it before acting.
- **No `Load model` button in the dialog.** It would be the most obvious CTA and
  it is exactly the duplication that was removed when the gear and the setup
  button were found to do the same thing. The dialog configures; the box acts.
  The load state is made prominent instead, so the dialog points at the action
  without owning a second copy of it.

### Phase wording

`loading` is one phase but three activities — fetching weights, building the ONNX
session, and the one-token warm-up. `describePhase(state, locale)` in
`setupStep.ts` picks the one that is actually happening instead of listing all
three: `Downloading model…` only while `state.progress` is non-null **and**
`info.cached` is false, `Preparing model…` otherwise. A successful load sets
`info.cached` to true, so after a release the box offers `Load model`, not the
full download and its sources again.

Progress is the runtime's aggregate `progress_total` only, shown as one
percentage. transformers.js 4.3.0 emits it right before every per-file
`progress`; forwarding both made the bar alternate between the overall and the
per-file figure at twice the message rate. The tokenizer files have no
aggregate, so their ticks arrive with `progress: null` — an indeterminate bar,
and a sign of life for the stall timeout. Naming all three at once
was both vaguer and noisier — the box status is a live region, so the full list
was announced on every change.

Switching task, changing locale and typing in the panel's own textarea never
start inference, and generation never implicitly downloads a model (`generate`
without a session is a `load` error).

### Auto-run

A prompt carried in by `::ai` runs on its own, and only under all of:

- `prefs.aiAutoRun` is on (default; off-able in either surface),
- the model is **already loaded in this tab**, which took the two clicks above,
- nothing else is in flight, and
- that exact text has not been submitted yet (the remembered prompt is seeded
  from the shared client, so a remount does not answer it twice).

So it can start inference, never a download. The magic input debounces at 500 ms,
so the panel sees settled text rather than keystrokes; `state.phase` is a
dependency of the effect, so text that arrives during a generation runs once
that generation settles instead of being dropped. A manual **Run locally** marks
the same prompt as submitted, which is what stops a settled manual run from
being repeated by the effect.

A pause while typing settles on a partial prompt, and a 256-token answer to it
could hold the model for minutes while the real prompt queued. So when the
carried prompt changes under a run the input started, the panel stops that run
— cooperatively, the model stays loaded — and the settled phase runs the
current text.

## Pins

| What | Value | Why |
| --- | --- | --- |
| Runtime | `@huggingface/transformers@4.3.0/dist/transformers.min.js` from jsDelivr | The standalone bundle. `dist/transformers.web.js` keeps an external ONNX dependency, and the package root can resolve an entry that drags native onnxruntime/sharp into the graph. Loaded with a dynamic `import()` inside the worker, so no npm or lockfile dependency is added. |
| Model | `onnx-community/Qwen2.5-0.5B-Instruct`, revision `cc5cc01a…`, dtype `q4f16` | 467.3 MiB, Apache-2.0, fits a phone GPU. |
| Prompt budget | 6,000 chars / 1,024 tokens of the rendered chat template | Rejected, never silently truncated. |
| Output budget | 256 new tokens, `do_sample: false`, `logits_processor: [createRepetitionGuard(promptLength)]` | Deterministic and bounded. Pure greedy decoding on this 0.5B model degenerates into repeating one token to the budget — measured on real hardware: one word repeated ~80 times. A repetition penalty of 1.1 plus a 3-gram block ended it. They are applied by `repetition.ts` to **generated tokens only**: the built-in `repetition_penalty` / `no_repeat_ngram_size` see `all_input_ids`, prompt included, which forbade translate, rewrite and summarize from copying any 3-token span of the input — names, numbers, URLs, code, CJK text. The guard is incremental (O(1) amortized per step) where the built-in n-gram processor rebuilt a JSON-keyed map over the whole sequence every token. Neither introduces sampling. |

`loadRuntime` asserts `env.version === '4.3.0'` so an unexpected CDN payload
becomes a load error instead of a half-initialized engine.

### Caches

| Cache | Contents |
| --- | --- |
| `magic-box-local-ai-<runtime>-<revision>-<dtype>` | model weights and the ORT wasm/factory files |
| `magic-box-local-ai-runtime-v2` | the pinned runtime module (Workbox `CacheFirst`) |

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
- **Timeouts.** 60 s inspect, 3 min generate. A download is bounded by
  inactivity, not wall clock: 120 s without a progress event, re-armed by every
  event. A fixed 10-minute load needed ≥ 6.5 Mbit/s sustained for 467 MiB, and a
  retry started the large file from zero, so a slower link could never install
  the model. Once the last byte is in — or from the start, for cached files —
  the WebGPU session build and warm-up get 5 min, since they emit no events. A
  timeout terminates the worker and is retryable.
- **Failure.** Any non-recoverable error terminates the worker. `inputLimit` and
  `invalidRequest` are recoverable: the loaded model stays usable for a shorter
  prompt.
- **One session per tab.** `useLocalAI` owns one `LocalAIClient` per worker
  factory at module level (one in production), reference-counted by the
  surfaces that show it: the box, the `/list` preview and Settings → Local AI.
  A model loaded in one is loaded in the others, and clearing the input to type
  the next question, or visiting Settings and coming back, no longer terminates
  it. Tests pass their own factory and so get an isolated client.
- **Memory.** A backgrounded tab holding ~500 MB of GPU memory is the usual
  cause of allocation failures elsewhere, so the worker is released when the
  tab is hidden, 30 s after the last surface unmounts, on `pagehide`, and on
  **Release memory**. The first two are *requests* (`requestRelease`) honoured
  once nothing is in flight: terminating mid-download lost the whole in-flight
  file (a phone locking its screen meant starting over) and mid-generation
  dropped an answer being waited for. With no surface left, a running
  generation is stopped first, since nobody can read it; a download is left to
  finish so its bytes land in the cache.

## Privacy

- Answers live in component state only. A prompt typed inside the box does too;
  a prompt carried in by `::ai` passes through the BoxSource as `sourceInput`
  and is deliberately excluded from search history. A share link the user
  creates would still carry it, which the box states while that mode is active.
- `src/functions/localAIPrivacy.ts` holds a **sticky** flag. It is set when the
  panel mounts (in a `/list` preview: on first real use), when an `::ai` input
  settles in the magic input, and before the Sentry/Firebase SDKs are
  constructed when the URL already carries `::ai`. It only ever closes: re-enabling telemetry on the way
  out could flush breadcrumbs collected while a private prompt was on screen.
- The gate is folded into `isAnalyticsEnabled()` rather than repeated at each
  call site, so every consumer inherits it. Both SDKs are constructed through
  `whenAnalyticsAllowed` — the first moment reporting is allowed, at boot or
  when the user opts in later — and never before; once constructed, Sentry
  follows the live flag through `beforeSend`/`beforeBreadcrumb`/
  `beforeSendTransaction` and Firebase through `setAnalyticsCollectionEnabled`.
  An earlier revision read the flag once at boot (`enabled: …`, an early return
  before the Firebase import), which left a mid-visit opt-in without reporting
  until a reload.
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
every token would re-render the whole box list per token. It publishes changes
only, and publishes `''` when the answer goes away (a new run, a reset).

The panel outlives the Box object it was rendered from: each edit of the magic
input regenerates boxes, and the fresh one arrives with an empty
`plaintextOutput`. `LocalAIBoxTemplate` remembers what it last published and
re-publishes it when a regenerated box lacks it, so Copy and Enter keep working
on the answer on screen. `MagicBox` returns the same array for a result that
changes nothing, so a re-publish never costs a list render.

`BoxCard` treats a click as the card's copy action only when it lands on the
card itself: a click on a control inside it (`a`, `button`, `input`, `select`,
`textarea`, `summary`, `label`, `[role="button"]`, contenteditable) belongs to
that control, and a click from a portal the template opened (the settings
dialog) is not the card's at all even though React bubbles it through. Clicking
into the prompt textarea to paste used to overwrite the clipboard with the last
answer first.

The box sets `showExpandButton: false`: re-mounting a stateful panel inside the
modal would drop the loaded model and the in-flight draft.

For the same reason `MagicBox` keys each card by its name **and its occurrence
within that name**, never by its position in the list. Editing the input changes
which sources match, so a position-based key remounted every box below the
change — with a carried prompt that is an ordinary keystroke away, and it cost a
loaded ~467 MiB model. Reproduced on real hardware, then covered by
`src/components/MagicBox/BoxIdentity.test.tsx`. The settings dialog
is a separate MUI `Modal` that the panel owns, so opening it never re-mounts the
panel; the panel keeps the client and passes the dialog callbacks. It shares
the modal chrome with the expanded box view (`ModalShell`) and its controls with
the Settings page (`@components/Controls`, `aiTaskOptions`/`aiLanguageOptions`),
and every surface's setup, stop and delete actions come from one hook,
`useLocalAISetup`. Delete is offered at any time except during another
deletion: it terminates the worker first, which also aborts the self-started
check that has no Stop of its own.

The source is excluded from `src/tui/sources.ts` — its template pulls in React
and a module worker, so it is not node-safe.

## Verification

Automated (`bun run test`):

- `src/features/local-ai/__test__/core.test.ts` — client ownership, worker
  isolation, cancellation, timeouts (inactivity-bounded download, stall,
  session setup), deferred release requests, `info.cached` after a load,
  recoverable vs fatal errors, prompt construction, bounds, capability checks.
- `src/features/local-ai/__test__/repetition.test.ts` — the prompt is never
  penalized or banned, answer trigrams are, and the incremental guard equals a
  from-scratch scan.
- `src/features/local-ai/__test__/engine.test.ts` — pinned-size/cache-only inspection,
  single-flight load, warm-up failure handling, streaming and output budget,
  over-budget rejection, cancel delivery, quota mapping, aggregate-only
  progress, and the answer-scoped logits processor in place of the built-ins.
- `src/features/local-ai/__test__/LocalAIPanel.test.tsx` — checking on open and
  its persistence, the pinned exact size, run preconditions, streaming,
  settled-output publishing, sanitized errors, and the carried-prompt rules:
  no worker while unloaded, one run per prompt (also across a remount), a stale
  run stopped when the prompt changes, honoring `aiAutoRun`, task and language;
  an editable draft during the check; a loaded model surviving a remount and
  released after the grace period.
- `src/features/local-ai/__test__/LocalAIPanelPreview.test.tsx` — a `/list`
  preview leaves telemetry on until a prompt or a setup click.
- `src/components/MagicBox/BoxCard.test.tsx` — control and portal clicks never
  copy, card clicks do, and the Local AI card keeps its answer across a
  regeneration.
- `src/functions/__test__/runtimePrefs.test.ts` and `firebaseConfig.test.ts` —
  SDKs start on the first allowed moment, including a mid-visit opt-in.
- `src/modules/boxSources/__test__/LocalAIBoxSource.test.ts` — option gating,
  registration, the carried `sourceInput`, and text after `::ai` on its line.
- `src/features/local-ai/__test__/LocalAIModelSettings.test.tsx` — provisioning
  from Settings with no box mounted: no worker on render, the same two steps,
  sanitized errors, Stop for its own download, and a cache deletion that
  terminates the worker first and touches only this feature's two caches.
- `src/features/local-ai/__test__/core.test.ts` also covers `describeSetupStep`
  (device/cache check before a quoted size, the source note on every download step, the
  cached variant, localization) and `describePhase`.
- `src/contexts/__test__/PreferencesContext.test.tsx` — `ai*` defaults and the
  rejection of unknown stored task/language values.
- `src/pages/MagicBox/MagicBoxPage.test.tsx` — an `::ai` input is never written
  to search history, the partial prompt recorded before `::ai` was typed is
  withdrawn, and entries from before the edit session are kept.
- `src/pages/ToolsList/ToolsList.test.tsx` — the box is listed on `/list`, its
  panel mounts, and it spawns no worker just by being on screen.

These inject a fake worker and a fake runtime. **No test downloads a model or
runs real GPU inference.**

Still required before this leaves experimental:

- [ ] HTTPS runs on a real Android/Chrome and iPhone/Safari device: first load,
      cached reload, all four tasks, speed and memory.
- [ ] Stop during download and during generation; double clicks; editing while
      generating; background/foreground; leaving the box; retry after failure.
- [ ] Network and storage inspection: no weights before the download click; no prompt or
      answer in any request body, URL, history entry or telemetry payload.
- [ ] Unsupported GPU and insufficient storage recovery paths.
- [ ] Offline cold start is **not** claimed. Cached weights are not proof that
      the runtime, service worker and a disconnected reload work.

## Rollback

Disable the box in Settings to hide it for a user. To remove the feature, delete
`LocalAIBoxSource` from `src/modules/boxSources/index.ts`; the panel, the
settings dialog and the worker are lazy, so nothing else ships. The `ai*`
fields in `PreferencesContext`, the Local AI section of `SettingsPage` (whose
`LocalAIModelSettings` block is itself lazy) and `features/local-ai/labels.ts`
are the only things reached from the eager bundle, and would have to go with
it. The telemetry hardening in
`src/functions/runtimePrefs.ts`, `src/index.tsx` and `src/firebaseConfig.ts` is
independently useful and can stay.

## Out of scope

Additional models, automatic model selection, conversation memory, cross-tab
coordination, self-hosting the runtime, verified offline readiness, and letting
the model drive tools.
