# Terminal UI

Build the WASM packages and install dependencies using the normal repository
setup, then run:

```sh
bun run tui                         # interactive, with a real terminal
bun run tui '1 + 2 * 3'
bun run tui --json 'SGVsbG8='
printf '{"hello":"world"}' | bun run tui --json
bun run tui --timezone -5 '1700000000'
bun run tui --prefs ./preferences.json 'now'
bun run tui -- --literal-input
```

`--json` emits only a JSON array to stdout (Bun's script banner is on stderr),
with `name`, `output`, `tag` and `kind`. Empty piped input exits immediately;
it never tries to start a raw-mode prompt. Positional arguments take precedence
over piped stdin. The shared `::option` parser works in all input modes.

For Node, compile the TypeScript/JSX entry point once:

```sh
bun run tui:build
bun run tui:node --json '2 * 3'
# or: node dist-tui/index.mjs --json '2 * 3'
```

Dependencies and WASM assets must remain installed alongside this build. This
is not a standalone executable; raw Node cannot execute the source JSX/path
aliases. Both WASM loaders read package-resolved bytes in Node/Bun, use browser
fetch on the web, share in-flight initialization, and allow retries on failure.

## Interaction and preferences

- Enter converts the current input.
- Ctrl+N / Ctrl+P moves through results, wrapping at either end.
- Ctrl+Y copies the selected output using OSC 52. Your terminal must allow
  clipboard operations; this also works over SSH in supported terminals.
  Copy is never automatic. Payloads above 100 KB are rejected.
- Ctrl+C exits. Newer submissions win over late async results.

Timezone defaults to UTC+8, using the same runtime preferences and offset
validation as the web. `--timezone` overrides `--prefs`; `--locale en|tw`
overrides an optional file locale. The preferences file accepts the web
`mb_prefs` JSON object, for example:

```json
{"timezoneOffset": -5, "locale": "tw"}
```

To transfer browser preferences, copy the `mb_prefs` localStorage value in
browser developer tools into a local JSON file and pass `--prefs`. The terminal
cannot directly read a browser's storage. Theme, AI and network/telemetry
settings are not imported. CLI errors go to stderr with a nonzero exit code.

## Sources and renderer boundary

Sources now use semantic `Box.view` hints (`code`, `keyValue`, etc.) instead of
importing React/MUI. Plaintext is always available to terminals and clipboard
consumers; structured options remain available to the web resolver. Existing
custom `boxTemplate` extensions continue to work.

The TUI derives its source list from the shared registry, including Base64,
Math, JWT, DataConverter and K8sSecret. It excludes Local AI and QR generation
(browser worker/canvas), My IP and Shorten URL (network side effects).
Directive-driven sources are available even if disabled by default on the web.
A failing source yields an error result without discarding other conversions.
Input-derived control characters are removed from terminal display, not from
the original copy/JSON output.

`TerminalRenderer` separates entry-point orchestration from Ink. An alternative
adapter implements `showResults` and `startInteractive`, consumes the same
renderer-neutral `terminalResults` model, and does not modify box sources.
Only Ink is shipped; there is no misleading OpenTUI selector without an adapter.

## Ink vs OpenTUI evaluation

Keep Ink, as recommended in issue #499's discussion. It already has the input
and testing components this conversion-oriented CLI needs. No measured
production bottleneck warrants replacing it. OpenTUI remains a viable option
for a future fullscreen/mouse-heavy layout.

An isolated Linux x64 evaluation installed `@opentui/core` and `@opentui/react`
0.5.14 outside the repository; no OpenTUI dependency was added to the app.
Its React `createRoot` successfully rendered text through `createTestRenderer`
under Bun 1.3.4. The package declares Bun >=1.3.0 and Node >=26.4.0; this
environment's Node 24.19.0 is outside its supported Node range. Native optional
packages are platform-specific, unlike this project's existing Ink dependency.

A diagnostic smoke workload verified 100 individual React text updates at
80x24 with these observations in this environment:

| Renderer | Test path | Elapsed |
| --- | --- | --- |
| Ink 7.1.0 | debug stream, `rerender` + `waitUntilRenderFlush` | ~86 ms |
| OpenTUI 0.5.14 | memory buffer, `flushSync` + `renderOnce` | ~60 ms |

These are **not comparable production benchmarks**: output destinations,
schedulers and flushing differ, there is no real terminal I/O, and the layout
is deliberately trivial. They establish integration feasibility, not a speed
claim. Before migration, benchmark identical real Magic Box result lists,
large JSON, input latency, resize/navigation and clipboard behavior across
Linux/macOS/Windows, Bun and a supported Node version.

The OpenTUI smoke can be reproduced in an isolated directory after installing
the pinned packages (using React 19):

```ts
import { createTestRenderer } from '@opentui/core/testing';
import { createRoot, flushSync } from '@opentui/react';
import { createElement } from 'react';

const test = await createTestRenderer({ width: 80, height: 24, useThread: false });
const root = createRoot(test.renderer);
try {
  const start = performance.now();
  for (let i = 0; i < 100; i++) {
    flushSync(() => root.render(createElement('text', null, `Result ${i}`)));
    await test.renderOnce();
    if (!test.captureCharFrame().includes(`Result ${i}`)) throw new Error('Missing frame');
  }
  console.log(performance.now() - start);
} finally {
  root.unmount();
  test.renderer.destroy();
}
```
