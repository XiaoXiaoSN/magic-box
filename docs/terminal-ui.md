# Terminal UI

The terminal interface uses the same tool registry as the web application.
It includes 89 headless sources from the 93-source registry, excluding
Generate QR Code and Local AI (browser APIs), and My IP and Shorten URL
(network side effects). Web Settings do not disable terminal sources;
directive-driven sources are available even when disabled by default on the web.
Use `--list` to inspect the current inventory and `--only` to select sources.

## Build, install and run

Follow the [local setup](../DEVELOPER.md#local-setup) first: build both WASM
packages, then install dependencies. From the repository root:

```sh
bun run tui                         # interactive, with a real terminal
bun run tui --json '1 + 2 * 3'        # one conversion, then exit
bun run tui:build
./dist-tui/magic-box-tui --json '2 * 3'
bun run tui:install -- --bin-dir "$HOME/.local/bin"
```

The build produces `dist-tui/magic-box-tui`, a standalone executable containing
the Bun runtime, bundled TUI code and both WASM packages. The installer copies
that executable into the chosen directory. Add that directory to `PATH`, then
run `magic-box-tui` from any working directory. No adjacent repository,
`node_modules`, WASM files, Bun or Node installation is required at runtime.
Build on each target host; local standalone verification currently covers
macOS arm64 only. There is no separate Node bundle or `tui:node` script.

## CLI input and output

The examples below use the installed binary. `bun run tui` accepts the same
arguments when working from source.

```sh
magic-box-tui --help
magic-box-tui --list
magic-box-tui --list --json
magic-box-tui --only math-expression --json '1 + 2 * 3'
printf 'SGVsbG8=' | magic-box-tui --only base64-decode --json
magic-box-tui --only uuid --raw uuid ::uppercase
magic-box-tui --only cron-expression --json '* * * * *' --opt locale=tw
magic-box-tui --json --timezone -5 '1700000000'
magic-box-tui --prefs ./preferences.json 'now'
magic-box-tui -- --literal-input
```

- Positional arguments are joined with spaces and take precedence over stdin.
  Quote multiline input to preserve its line breaks. Without positional input,
  non-interactive mode reads stdin to EOF, with a 1 MiB limit. Empty piped stdin
  without directives is a usage error; it never starts an interactive prompt.
- Put each shared `::option` on its own line in piped or multiline input.
  Separate arguments beginning with `::` become directive lines automatically.
  `--opt key=value` (or `-o key=value`) adds a directive and can be repeated.
  After `--`, flag-looking arguments become input, but arguments starting with
  `::` still become directives.
- `--only` accepts a source ID or an unambiguous source name, ignoring case.
  Repeat it or comma-separate selectors. Selections are deduplicated and run in
  selection order; without a filter, results follow registry order.
- `--json` writes a JSON array of successful results to stdout, with `name`,
  `output`, `tag` and `kind`. With `--list`, it instead emits source metadata,
  including IDs, descriptions, default inputs and option keys. Source errors
  go to stderr, outside the JSON. Bun's source-script banner is also on stderr.
- `--raw` writes only the first matching plaintext result, without an added
  newline. It cannot be combined with `--json` or `--list`.
- Without `--json` or `--raw`, Ink renders named results. Input-derived control
  characters are removed from terminal display and raw output; JSON and copied
  output retain the original text.

Source failures are reported separately and do not discard other successful
conversions. One-shot execution exits with status 0 when at least one result
matches, even if another source fails; no matches or an unexpected execution
failure exits with status 1. Invalid arguments/preferences, unknown or ambiguous
source selectors, empty piped input and oversized stdin exit with status 2.
`--help` and a valid `--list` exit with status 0 without converting input.
`--list` cannot be combined with positional input or directives.

## Interaction and preferences

Running with a real terminal and no input, directives, `--json` or `--raw`
opens the interactive prompt:

- Typing updates results after a 200 ms debounce; input edits cancel the prior
  request and late results cannot replace the newer query.
- Up / Down selects results, wrapping at either end and focusing the result list.
- Enter copies the selected output. With results focused, `y` also copies;
  Ctrl+Y copies from either the input or results. Tab returns focus to input;
  typing another character while results are focused resumes editing.
- Esc or Ctrl+C exits. Clipboard copying is always an explicit action.

On macOS, copying uses `pbcopy` when available. Otherwise it uses OSC 52, which
requires clipboard support in the terminal and can work over SSH. The OSC 52
fallback rejects payloads above 100,000 UTF-8 bytes; that limit does not apply
to the macOS system clipboard path.

Timezone defaults to UTC+8, using the same supported offsets as the web.
`--timezone` overrides the preferences file; `--locale en|tw` overrides its
locale (`zh_TW` is also accepted). Without a file or override, locale is `en`.
The preferences file accepts the web `mb_prefs` JSON object, for example:

```json
{"timezoneOffset": -5, "locale": "tw"}
```

To transfer browser preferences, copy the `mb_prefs` localStorage value in
browser developer tools into a local JSON file and pass `--prefs`. The terminal
cannot directly read browser storage. Only timezone and locale are imported;
theme, AI and other web settings are ignored, and terminal analytics is disabled.
The CLI validates saved timezone and locale values even when overrides are given.

## Execution and renderer boundary

Sources run concurrently, while results retain source order. Only successful,
nonempty plaintext results enter the output list; source errors appear on stderr
in one-shot mode and alongside results in interactive mode. The registry lazily
loads selected implementations, so listing metadata does not execute tools.

The shared `Box` model provides plaintext and semantic `view` hints such as
`code` and `keyValue`; web rendering resolves these hints and custom
`boxTemplate` extensions. The terminal consumes plaintext through the
renderer-neutral `terminalResults` model. `TerminalRenderer` separates CLI
orchestration from Ink through `showResults` and `startInteractive`. Ink is the
only shipped adapter.

## Ink vs OpenTUI evaluation

The following records the isolated evaluation for issue #499. Its environment
and timings are historical, separate from the current standalone verification.

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
