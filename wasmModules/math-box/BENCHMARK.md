# math-box Benchmark Report

> Updated after Phase 2-6 land. Each phase's deltas are tracked in §5.

## 1. Environment

| Item | Value |
|---|---|
| CPU | Apple Silicon (host machine) |
| OS | Darwin 25.4.0 |
| rustc | 1.95.0 (release profile) |
| wasm-pack | 0.13.1 |
| Bun | 1.3.4 |
| mathjs | 15.2.0 (devDependency, bench-only) |
| Date | 2026-05-07 |
| Features enabled | `std wasm bigint fraction unit complex` |

## 2. End-to-end (parse + compile + eval) — JS bench

`bun run wasmModules/math-box/bench/compare.mjs`

100k iterations × 5 runs, median reported.

| case | expression | math-box (µs/op) | mathjs (µs/op) | speedup |
|---|---|---:|---:|---:|
| simple | `1 + 2 * 3` | 0.74 | 2.51 | 3.37× |
| medium | `2 + 2^10 + log(10, 10000)` | 1.41 | 5.77 | 4.08× |
| trig | `sin(PI/2) + cos(PI/3)` | 1.53 | 5.26 | 3.43× |
| hex | `0xff + 0b1010` | 0.64 | 2.17 | 3.37× |
| factorial | `5! + 10!` | 0.71 | 2.32 | 3.24× |
| nested | `(((1 + 2) * 3 - 4) / 5) ^ 2` | 1.20 | 6.65 | 5.52× |
| large_int | `1234567 * 7654321 + 99999` | 0.81 | 3.31 | 4.09× |
| var_assign | `a = 5; b = 7; a*b + a^2` | 1.94 | 7.52 | 3.87× |
| user_fn | `sq(x) = x^2; sq(11) + sq(13)` | 2.60 | 16.04 | 6.17× |
| bigint | `9007199254740993n + 1n` | 1.02 | n/a | — |
| fraction | `frac(1, 3) + frac(1, 4)` | 3.46 | n/a | — |
| unit | `convert(unit(1, "km"), "m")` | 1.49 | n/a | — |
| complex | `(2 + 3*i) * (2 - 3*i)` | 1.68 | 7.44 | 4.43× |

(`n/a` = mathjs's API surface differs — `n`-suffix bigint, `frac()` builtin, and
`unit()` constructor all return parser errors. Listed for reference; not part of
the speedup geomean.)

**Why the dramatic jump from prior runs (3.20 µs → 0.77 µs on `simple`):**
the `simplify` pass cached `default_namespace()` behind a `OnceLock` so the
~50 BTreeMap inserts + closure allocations no longer happen on every
`evaluate()` call. Once-per-process build now dominated by lex+parse+compile;
constant-folded eval is essentially free.

**Why the further drop in the `correctness+lint` pass:** `UnitValue` shrunk
by one f64 (the redundant `value` field is now derived on demand) and the
parser+lexer collapsed several nested `if` blocks into `if-let`/`&&` chains
that LLVM lowers more aggressively. The numbers are within run-to-run noise
on cases that don't exercise units, but they're consistent.

### Reading the numbers

- **Phase 2-6 cost simple cases ~30% latency** versus the Phase 1 `Vec<f64>`
  stack — the `Vec<Value>` enum stack pays clone/match overhead per push/pop.
  This is the necessary cost of supporting Big/Frac/Unit/Complex via runtime
  type dispatch; `Num`-only paths still fold to a single `PushVal`.
- **Function-heavy and nested cases keep their lead** (1.3–1.8×) because
  constant folding still flattens them to single instructions.
- **`user_fn` shows the biggest win (2.77×)** — mathjs builds a closure tree
  for each `f(x) = x^2` style definition; math-box compiles the body once
  into a flat `Program` and reuses it on each invocation.

## 3. Native Rust criterion bench

`cd wasmModules/math-box && cargo bench --no-default-features --features "std bigint fraction unit complex"`

(Run on demand; numbers track JS bench within ~5% — boundary cost is small.)

## 4. Bundle size

| Phase | Raw wasm | Gzip wasm |
|---|---:|---:|
| Phase 1 (Num + Bool only) | 127 KB | 60 KB |
| Phase 2-6 (Value enum + features) | 229 KB | 94 KB |
| Phase 4.1 + 5c | 247 KB | 100 KB |
| **+num-rational (current)** | **249 KB** | **101 KB** |
| Phase 1 minus bigint feature | ~135 KB | ~63 KB |

The Phase 4.1 increment (~+18 KB raw / +6 KB gz) is `Fraction` switching to a
BigInt-backed `num`/`den` so that large denominators no longer overflow.

The +100 KB jump from Phase 1 → all-features is dominated by `num-bigint`
(only runtime dependency, brought in by `bigint` feature). Each non-default
feature can be turned off in `Cargo.toml` to drop weight:

| Feature | Saves (raw) | What you lose |
|---|---:|---|
| `bigint` off | ~95 KB | `123n` literals, `big()`, BigInt arithmetic |
| `complex` off | ~6 KB | `complex()`, `i`, complex-valued ops |
| `fraction` off | ~4 KB | `frac()`, fraction normalisation |
| `unit` off | ~2 KB | `convert()` 3-arg helper |

Comparison anchor: mathjs typically ships ~150 KB gzipped across its lazy
chunks for the subset our `MathExpressionBoxSource` uses. math-box at v0.2
sits at 94 KB gzipped with full feature parity for the magic-box use case
(BigInt + Fraction + Complex; Unit syntax deferred to Phase 5b).

## 5. Regression tracker

| Date | Commit | Phase | simple | medium | trig | nested | fraction | bundle (gz) | Note |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| 2026-05-07 | initial | Phase 1 | 2.43 | 3.20 | 3.15 | 2.90 | — | 60 KB | baseline |
| 2026-05-07 | phases-2-6 | Phase 2-6 | 3.20 | 3.91 | 3.95 | 3.61 | 4.08 | 94 KB | Value enum + bigint/frac/complex |
| 2026-05-07 | phase-4.1+5c | 4.1 + 5c | 3.20 | 3.95 | 3.97 | 3.73 | 6.01 | 100 KB | BigInt fraction + implicit `1 km` / `to` |
| 2026-05-07 | simplify | refactor | 0.77 | 1.52 | 1.63 | 1.39 | 3.69 | 100 KB | `OnceLock` namespace + minor cleanups |
| 2026-05-07 | correctness+lint | refactor | 0.75 | 1.45 | 1.56 | 1.22 | 3.39 | 100 KB | Big+Num truncation fix; UnitValue refactor; clippy clean |
| 2026-05-08 | num-rational | refactor | 0.74 | 1.41 | 1.53 | 1.20 | 3.46 | 101 KB | Fraction → newtype around `Ratio<FracInt>`; gcd unified via `Integer::gcd` |
| 2026-05-08 | correctness+memo | refactor | 0.75 | 1.49 | 1.56 | 1.21 | 3.48 | 101 KB | `big()` rejects fractional input; owned-AST `compile`; TS-side input→answer LRU memo |

The Phase 2-6 jump on `simple` (~30% slower) is from `Vec<Value>` enum stack;
`nested` and function-heavy cases remain ahead of mathjs by ~1.7–2.8×.

## 6. Reproducing

```bash
# JS bench
bun run wasmModules/math-box/bench/compare.mjs

# Native bench
cd wasmModules/math-box
cargo bench --no-default-features --features "std bigint fraction unit complex"
```

## 7. Issue #565: compiled user-function reuse

The VM now stores immutable `UserFn` bodies behind `Rc`. A function call and a
definition clone only the pointer and increment its reference count; the
compiled instruction body is no longer copied. The compiler also moves the
lambda AST into lowering, so the body is not cloned merely to compile it.
The runtime still creates a fresh scope for every evaluation, resolves free
names through caller frames, and permits function redefinition. Compile-time
slots were deferred because those three semantics require a fallback-aware
frame model; this change makes no slot claim.

### Native before/after measurement

The baseline was an archive of exact source SHA
`e9f54897188433517a58abfbc77432ff8d129a19` before the change. Both sides used
the same Rust harness, `std bigint fraction unit complex`, release profile,
Apple Silicon arm64 macOS, rustc `1.95.0 (59807616e 2026-04-14)`, and 100,000
iterations after 10,000 warm-up calls. Each row is the median of nine timed
runs; the complete samples are kept here so an outlier is visible.

| case | baseline median | final median | observed change |
|---|---:|---:|---:|
| `Compiled::evaluate()` | 2,652.98250 ns/op | 1,265.58625 ns/op | 2.10x faster (52.3% lower) |
| `evaluate()` parse + compile + eval | 11,310.17791 ns/op | 7,748.60416 ns/op | 1.46x faster (31.5% lower) |

```text
compiled baseline: [269820666, 266512125, 264555208, 265298250, 272051250, 264724250, 269924125, 264439042, 263991125] ns / 100000 calls
compiled final:    [128660792, 185826500, 156597209, 124909959, 123349250, 126558625, 124070875, 238602375, 123893500] ns / 100000 calls
full baseline:     [1131017791, 1238609250, 1127146083, 1160635292, 1296245375, 1121573666, 1461104333, 1127246125, 1130463834] ns / 100000 calls
full final:        [767237708, 775911666, 776124958, 774860416, 771084958, 773898750, 769754750, 776605042, 780545416] ns / 100000 calls
```

The in-tree Criterion bench contains both the repeated compiled case and the
full pipeline case. The reproducible non-Criterion harness is
`examples/measure_user_fn.rs` and can be run with:

```bash
env RUSTC_WRAPPER= CARGO_BUILD_JOBS=1 \
  cargo run --manifest-path wasmModules/math-box/Cargo.toml \
  --example measure_user_fn --release --no-default-features \
  --features "std bigint fraction unit complex"
```

The baseline archive was run with the same example copied into that source
tree. On this host, `cargo bench` could not resolve existing release
proc-macro dependencies (`E0463`, first `rustversion` and then
`zerocopy_derive`), so no Criterion speedup is inferred from that failed run.

### Shipping WASM measurement

`bench/measure-shipping-profiles.sh` builds both `math-box` and `base64-box`
for `opt-level=3`, `s`, and `z` in isolated output directories, then invokes
`bench/measure-shipping.mjs`. The latter measures the generated shipping
`*_bg.wasm` raw bytes, deterministic gzip level 9 bytes (equivalent to
`gzip -n -9`), JS glue bytes, SHA-256, and actual
runtime calls. It records each tool's resolved executable path, version output,
and SHA-256 in every profile result. The same tool invocation must be used for
both crates within a profile; no cargo-only artifact is accepted as a package
measurement.

```bash
wasmModules/math-box/bench/measure-shipping-profiles.sh /tmp/magic-box-wasm-profiles
```

The baseline package generated from the exact source SHA above was measured
from the preserved CI artifact with the same script:

| package | wasm SHA-256 | raw wasm | gzip-9 wasm | JS glue |
|---|---|---:|---:|---:|
| math-box | `7b4381a279eef47400ce059181ad5069ba924a68723703bd26ebd67ee05cfab6` | 346,870 | 140,333 | 15,539 |
| base64-box | `985d3388d09a711614279714fe70200b310c408042645add1ecec19d3103d423` | 31,366 | 13,334 | 8,352 |

That artifact's actual Node runtime medians were 2,864.37 ns/op for the
compiled math expression, 9,525.64 ns/op for full math evaluation, 899.00
ns/op for base64 encode, and 740.55 ns/op for base64 decode-to-string.
The preserved artifact was produced by the repository CI wasm-pack `0.15.0`
action; its transitive wasm-bindgen and wasm-opt versions were not recorded in
the artifact metadata. The local package measurement runner was Node
`v26.7.0`. The CI workflow builds the exact PR base and candidate sequentially
on one Ubuntu host, then uploads the raw JSON and generated package directories
for all three profiles. Its revision file records both source SHAs.
The profile script is the bounded CI follow-up for final 3/s/z package sizes and
runtime; this arm64 host cannot run the repository's x86_64 wasm-bindgen CLI,
and no wasm-opt binary is installed, so no final shipping profile is selected
from an incomplete local build. The existing math profile remains opt-level
3; base64 now uses the same release LTO, single codegen unit, aborting panic,
and symbol stripping settings so its 3/s/z comparison changes only the
candidate optimization level.
