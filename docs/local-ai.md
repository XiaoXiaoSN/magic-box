# Local AI (experimental)

Open the home page, select **Local AI**, choose a task and output language, then
allow the download and click **Download / load model**. Once ready, click **Run
locally**. Typing, selecting a task and checking consent do not start inference.
The ordinary Tools panel remains unchanged and is unmounted while AI is active.
Switch to AI **before** entering private text: existing Tools history is not erased.

## Scope and acceptance

| Requirement | Implementation | Acceptance |
| --- | --- | --- |
| R1 Explicit download and execution | T1 `LocalAIPanel`, `client` | A1 No Worker before the load click; one operation at a time |
| R2 Local bounded generation | T2 `runtime`, `protocol`, `engine` | A2 Worker WebGPU/adapter/shader-f16 check before external imports; reject >6,000 characters or >1,024 prompt tokens; at most 256 new tokens |
| R3 Real cancellation and recovery | T3 `client` | A3 Terminate on stop, release, timeout, failure or unmount; ignore stale Worker/request events; a new Worker can retry |
| R4 Private drafts and safe output | T4 home wrapper, `localAIPrivacy`, `src/index.tsx` | A4 No AI input in BoxSources, history or share URLs; escaped text output; copy current output; mute telemetry until reload after entering AI |
| R5 Explicit asset lifecycle | T5 `runtime`, `client`, UI controls | A5 Use the namespaced cache only; stop this tab's Worker before deleting it; report deletion failure |
| R6 Mobile/locale integration | T6 panel, CSS, strings, Vite | A6 Reuse existing layout/color/density/segmented-control tokens, clipboard helper and locale; English and Traditional Chinese; preserve normal tools and PWA update configuration |

T1–T6 are implemented. Browser integration and physical-device acceptance still
need verification; this feature must not be described as validated on phones yet.

## Runtime and ownership

`MagicBoxWithLocalAI` selects between the existing `MagicBoxPage` and a lazy AI
panel with its own in-memory input. It does not change `BoxSource`, `Box`, TUI,
ordinary tool matching, normal history, or the existing PWA update protocol.

The panel owns one `LocalAIClient`. The client owns at most one module Worker.
The Worker owns one pipeline and admits one operation at a time. Both Worker
identity and monotonically increasing request IDs gate delivered events. Model
loading and generation use separate explicit commands. The main thread never
runs model inference. Download progress is **per file**, not an aggregate ETA.

Stop uses `Worker.terminate()`, including during blocked download/initialization.
It retains partial text marked **Stopped**, but invalidates model readiness.
Release/unmount also clear the result. Subsequent execution requires an explicit
load; existing cached files may be reused. No queued jobs or automatic retries.
Timeouts are 15 minutes for loading and 2 minutes for generation. These are product
limits, not measured performance claims. Input validation errors preserve a healthy
loaded model; other failures discard the Worker. Raw exception strings are never
sent to the UI or telemetry.

## Pinned assets and deployment

- Transformers.js: `https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0`
  (the package's browser CDN build), imported only inside the Worker after consent.
- Model: `onnx-community/Qwen2.5-0.5B-Instruct`, revision
  `cc5cc01a65cc3ff17bdb73a7de33d879f62599b0`, dtype `q4f16`.
- Cache name: `magic-box-local-ai-v1`. This contains model/runtime assets, not prompts.
- No API keys, server inference, automatic cloud/CPU fallback, arbitrary model URL,
  model-driven tools, generated HTML execution, or app-level prompt persistence.

The version-pinned CDN import is deliberate: this experimental feature adds no
npm/lockfile dependency or model bundle to ordinary Tools and cannot precache
hundreds of MB during PWA installation. `worker.format = 'es'` preserves the module
Worker's external dynamic import. Do not add models to Workbox precaching or raise
its 4 MiB limit. Existing versioned service worker behavior is retained.

**This MVP does not promise offline cold starts.** Model/WASM caches are best effort;
the CDN module and app chunks may still need a network connection, and storage can
be evicted. A production offline mode needs self-hosted/versioned runtime assets
and an end-to-end offline readiness check. Do not label a downloaded model “offline
ready.” Close other AI tabs before deleting cache; another tab can download again.

Use HTTPS for phone testing. LAN HTTP addresses do not receive the device-local
localhost exception. Even a successful adapter probe does not prove enough memory
for this model; initialization/inference failure must remain recoverable.

References: [React Worker tutorial](https://huggingface.co/docs/transformers.js/en/tutorials/react),
[official CDN installation](https://huggingface.co/docs/transformers.js/en/installation),
[pinned pipeline implementation](https://github.com/huggingface/transformers.js/blob/4.2.0/packages/transformers/src/pipelines/text-generation.js),
[model files](https://huggingface.co/onnx-community/Qwen2.5-0.5B-Instruct/tree/cc5cc01a65cc3ff17bdb73a7de33d879f62599b0).

## Validation

The 22 assertions/scenarios in `__test__/core.test.ts` were compiled and run with
Node's native test runner (only the temporary test runner import was changed from
Vitest to `node:test`): **22 passed**. The dependency-free implementation passed a
strict TypeScript 5.8.3 check; all 14 changed/new TypeScript and TSX source files
passed TypeScript syntax parsing at that checkpoint. These are not equivalent to
the project's full TypeScript 7/Vitest/build checks.

`__test__/panel.test.tsx` adds six React tests for consent, output escaping/copying,
stopping, cleanup, unsupported hardware, and mode/history isolation. They were
**not run locally** because this environment could not resolve npm/GitHub hosts
for dependency installation. No actual model weights were downloaded or executed.

With the repository's normal Bun/WASM environment installed, run:

```sh
bun run test --run src/features/local-ai
bun run build
bun run lint
```

Before merge, check actual iPhone/Safari and Android/Chrome hardware over HTTPS:
first download, cached reload, first token, repeated short requests, stop during
load and generation, background/foreground, route changes, insufficient memory,
disabled storage, delete/re-download, and unsupported hardware. Inspect network
requests and storage to confirm the prompt does not leave the AI execution path.
Do not turn this checklist into a claimed pass without performing it.

## Follow-ups and rollback

Required before calling the feature phone-validated: R2/R6 real-device checks and
project build/UI test results. Recommended follow-ups, not part of this MVP: bundled
or self-hosted runtime plus offline readiness, model-quality benchmarks, Qwen3 or
larger model selection, shared settings-page management, and optional `::ai` syntax.
Do not expand this PR into a BoxSource scheduler refactor or tool-using agent.

Rollback is reverting this feature commit. To remove downloaded assets as well,
use the feature's **Delete model cache** control before rollback, or remove only
`magic-box-local-ai-v1` from site Cache Storage. Do not clear unrelated app data.
