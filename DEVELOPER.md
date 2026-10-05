# Developer guide

For using Magic Box, start with the [README](README.md). This guide covers
working on the application and maintaining its documentation.

## Local setup

Install Bun 1.3.4 (the `packageManager` version in `package.json`), a current
stable Rust toolchain with the `wasm32-unknown-unknown` target, and wasm-pack
0.15.0. CI also installs Node.js 22 for tooling; Bun runs the development
scripts.

From the repository root, build both local WASM packages before installing
root dependencies:

```sh
bun run build:wasm
bun install --frozen-lockfile
bun run start
```

The development server runs at <http://localhost:3000>. `base64-box` and
`math-box` are local `file:` dependencies backed by `wasmModules/*/pkg`.
Rebuild them when their Rust source changes.

## Commands

| Command | Purpose |
| --- | --- |
| `bun run build:wasm` | Build both local WASM packages |
| `bun run start` | Start the development server |
| `bun run build` | Type-check and build the production site into `build/` |
| `bun run test` | Run Vitest in watch mode |
| `bun run test --run` | Run the unit tests once |
| `bun run test:ui` | Open the Vitest UI |
| `bun run lint` | Check source formatting and lint rules with Biome |
| `bun run lint:fix` | Apply Biome fixes |
| `bun run test:e2e` | Run Cypress E2E tests |
| `bun run cypress` | Open Cypress |
| `bun run docs:generate` | Regenerate the tool reference and llms.txt |
| `bun run docs:check` | Run generator tests and check for documentation drift |

The [terminal guide](docs/terminal-ui.md) covers `bun run tui`, compiling with
`bun run tui:build`, and running the compiled entry with `bun run tui:node`.
The source `bin` entry is not a standalone Node executable: installed
dependencies and WASM packages are needed alongside the compiled entry.

## Validation

Vitest uses jsdom for the application tests. Cypress uses the custom commands
in `cypress/support/`; CI also runs component tests with `component: true`.
Run the relevant tests and `bun run build` when changing application code.

For math-box changes:

```sh
cargo test --manifest-path wasmModules/math-box/Cargo.toml
```

See the [math-box README](wasmModules/math-box/README.md) for the implemented
syntax and test coverage, and its [benchmark report](wasmModules/math-box/BENCHMARK.md)
for the measured artifact and reproduction commands.

## Documentation

- `README.md`: introduction, input syntax, keyboard shortcuts and selected
  usage examples, each in the original `<details>` / `<summary>` format.
- `docs/tools.md`: complete generated tool reference.
- `docs/`: focused user guides, including Local AI, terminal usage and settings.
- `DEVELOPER.md`: setup, commands, validation and maintenance.
- `wasmModules/math-box/README.md` and `BENCHMARK.md`: evaluator-specific
  behavior, limits and measurements.
- `public/llms.txt`: generated text reference, served at `/llms.txt`.

### Updating tools

The runtime registry in `src/modules/boxSources/index.ts` is also the source
for the interactive `/list` page and generated documentation. After adding a
source or changing its metadata/options, run:

```sh
bun run docs:generate
bun run docs:check
```

Commit `docs/tools.md` and `public/llms.txt` with the source change. The
quality CI job checks both outputs on every PR without rewriting them.
The README stays hand-edited: add useful screenshots or usage tips inside a
matching `<details>` block, and link to the reference for the full inventory.

The generator reads TypeScript syntax without executing tools, browser
components, WASM or network requests. Unsupported metadata/option expressions
fail with a file and expression to handle in `scripts/generate-tool-docs.mjs`.
Sources that delegate option parsing to a shared helper can expose
`optionKeys` referencing the same constant, as JSON Tools does.

The generator uses a pinned TypeScript 5.x parser under the `typescript-docs`
alias because TypeScript 7 no longer exports that parser API. The application
compiler remains TypeScript 7.

## Deployment

The Firebase Hosting workflow deploys `main` after its quality jobs succeed.
The hosting configuration is in `firebase.json`; `.firebaserc` selects the
`magic-box-b8bdc` project.

For a manual deployment with access to that project, build the site first,
then use the Firebase CLI:

```sh
bun run build
npm install -g firebase-tools
firebase login
firebase deploy --only hosting
```

The repository already includes its Firebase configuration. `firebase init`
is only needed when configuring a different project, not for normal setup.
