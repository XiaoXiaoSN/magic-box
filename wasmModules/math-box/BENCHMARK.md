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

The VM now stores immutable `UserFn` bodies behind `Arc` on native targets and
`Rc` on `wasm32`. This preserves native `Compiled: Send + Sync` while keeping
non-atomic reference counts in the WASM VM. A function call and a definition
clone only the pointer and increment its reference count; the compiled
instruction body is no longer copied. Native calls pay atomic reference-count
updates instead of copying the body. The compiler also moves the
lambda AST into lowering, so the body is not cloned merely to compile it.
The runtime still creates a fresh scope for every evaluation, resolves free
names through caller frames, and permits function redefinition. Compile-time
slots were deferred because those three semantics require a fallback-aware
frame model; this change makes no slot claim.

### Native before/after measurement

The refreshed baseline is exact source SHA
`b40cf6a6caf4516b702e45c585a612fb492903ff`; the measured candidate source is
`763f66d9c5d6d387731e1270bdc9a4d02d575552` and uses native `Arc`, replacing
the earlier native `Rc` implementation. Published source commit
`1cb35cae6d8a61ebb5b2e9cb0b1f92ecf226a0a7` contains the identical measured
compiler, VM, and harness, so that revision can also reproduce the native
comparison. To identify the runtime sources independently of the branch
rebase, their SHA-256 values are:

```text
src/compiler.rs: 247f311e63a486629ba3476dba2c5bb407c61a15c1a2f2bac079ee406cb94673
src/vm.rs:       1e5bfe30b74b9e9662e74f13165168149c3cfa3dc207085693a17670564f8061
```

Both sides used the same checked-in `examples/measure_user_fn.rs` harness,
`std bigint fraction unit complex`, Apple Silicon arm64 macOS (Darwin 27.0.0),
and rustc `1.95.0 (59807616e 2026-04-14)` on 2026-10-15. Each library was built
with the locked dependencies and release profile in its own target directory.
The harness was linked directly with the same optimization settings to avoid
the unrelated release development-dependency failure described below. Both
builds completed before timing, then baseline and candidate ran serially on
the same host. Each row reports the median and observed min–max of nine timed
runs of 100,000 calls, after 10,000 warm-up calls; these ranges are sample
extrema, not confidence intervals.

| case | baseline median ns/op (min–max) | native `Arc` median ns/op (min–max) | observed change |
|---|---:|---:|---:|
| `Compiled::evaluate()` | 1,917.09250 (1,903.45917–2,015.78959) | 977.11709 (969.27584–1,026.47208) | 1.96x faster (49.03% lower) |
| `evaluate()` parse + compile + eval | 7,835.78042 (7,766.83833–8,176.83083) | 5,576.06792 (5,539.42542–5,631.86209) | 1.41x faster (28.84% lower) |

```text
compiled baseline: [201578959, 192371959, 192694292, 191709250, 197129042, 190345917, 190681958, 191034625, 190596000] ns / 100000 calls
compiled native Arc: [102647208, 97475958, 97131291, 97474666, 98342625, 97711709, 96927584, 98557375, 99427375] ns / 100000 calls
full baseline: [817683083, 781151417, 787763084, 791615750, 779984041, 776683833, 783578042, 796343167, 779938458] ns / 100000 calls
full native Arc: [558505125, 553942542, 554403083, 554703875, 563186209, 554155417, 558145750, 559843500, 557606792] ns / 100000 calls
```

The in-tree Criterion bench contains both the repeated compiled case and the
full pipeline case. On this host, release example/bench builds that include
development dependencies fail with `E0463` resolving the existing
`rustversion` proc macro. No Criterion speedup is inferred from that failure.
The library-only release build succeeds; the exact direct-harness procedure
used for each source tree was:

```bash
native_target=/tmp/math-box-native-target
RUSTC_WRAPPER= CARGO_BUILD_JOBS=1 CARGO_TARGET_DIR="$native_target" \
  cargo build --manifest-path wasmModules/math-box/Cargo.toml \
  --locked --lib --release --no-default-features \
  --features "std bigint fraction unit complex"
rustc --edition 2024 -C opt-level=3 -C lto=fat -C codegen-units=1 \
  -C panic=abort \
  --extern "math_box=$native_target/release/libmath_box.rlib" \
  -L "dependency=$native_target/release/deps" \
  wasmModules/math-box/examples/measure_user_fn.rs \
  -o "$native_target/measure-user-fn"
"$native_target/measure-user-fn"
```

The baseline was extracted with `git archive` and received an unchanged copy
of the candidate's harness, whose SHA-256 is
`ebc577ab423b346de250ab058b7505ea31f46e7b4d1025ef32ce08a9b762715f`.
These measurements supersede the earlier native `Rc` timings; they do not
isolate the native `Arc` versus `Rc` overhead.

### Shipping WASM measurement

The native thread-safety correction selects `Rc` for `wasm32`. Fresh generated
packages and runtime calls were measured in successful GitHub Actions run
[38761955169](https://github.com/XiaoXiaoSN/magic-box/actions/runs/38761955169),
artifact `wasm-profile-matrix-38761955169`, on 2026-10-15. The baseline is exact
source SHA `ea0e7c439400627f88b318650fe35319997f5260`; the candidate source is
`1cb35cae6d8a61ebb5b2e9cb0b1f92ecf226a0a7`, built through GitHub's synthetic
merge SHA `0c5c17b5bf60bc1913993fd5a47935268cc6afd6`. `revisions.txt` records
the baseline and synthetic candidate used by the job.

The math WASM hashes differ from the packages in earlier run `38752303306`;
binary equality is not claimed. All three raw math sizes match that run,
while profile `3` gzip size is unchanged and profiles `s` and `z` are each
one gzip byte larger.
The following runtime results come entirely from the fresh job.

`bench/measure-shipping-profiles.sh` builds both `math-box` and `base64-box`
for `opt-level=3`, `s`, and `z` in isolated output directories, then invokes
`bench/measure-shipping.mjs`. It measures the actual generated shipping
`*_bg.wasm` raw bytes, deterministic gzip level 9 bytes (equivalent to
`gzip -n -9`), JS glue bytes, SHA-256, and runtime calls. Each profile's baseline
and candidate used the same x86_64 Ubuntu runner and locked dependencies;
profiles and crates were built serially in one job.

```bash
wasmModules/math-box/bench/measure-shipping-profiles.sh /tmp/magic-box-wasm-profiles
```

This run traces the tools launched by `wasm-pack`, including bootstrap, and
records the resolved compiler and cargo binaries rather than rustup proxies.
The six measurement JSON files contain identical baseline/candidate tool
metadata, including executable paths and these hashes:

| tool | version | executable SHA-256 |
|---|---|---|
| `rustc` | `rustc 1.99.0 (b940084d7 2026-09-28)` | `f3834d26669b03f6855fa54bd2381443123e860167bc0c7a8dd137e5cf6e5e4f` |
| `cargo` | `cargo 1.99.0 (5f94df478 2026-08-27)` | `e951141cc55a6cd7b9876d187bd30a3720e6086b99413af95e3b8de1cdd72f14` |
| `wasm_pack` | `wasm-pack 0.15.0` | `c6c3d54702f4bae4a1d51e37e19c2c61b130865dc3fabc745eebe8194b87b253` |
| `wasm_bindgen` | `wasm-bindgen 0.2.129` | `fb59da714982a04273e9e4b09a85e523e5dd04de35b1a4a8b1641785ee7a71cf` |
| `wasm_opt` | `wasm-opt version 117 (version_117)` | `621b5a984f16d0323ea7aa8b389ac9ccda0950ddee5de0e99292970129f571ed` |
| `node` | `v22.23.3` | `fde6a4bf8d0562f7751d1a2d6cb9b417c4cfe107bbcb0aa3e9a24e125e348f48` |

Every runtime row is the median of five samples of 100,000 calls, after a
10,000-call warm-up. The min–max ranges are observed sample extrema, not
confidence intervals. Each profile directory in the artifact contains
`measurement.json`, `baseline-measurement.json`, the generated packages,
`toolchain-paths.txt`, and the build traces. Math JS glue is 15,539 bytes for
both baseline and candidate in every profile.

| math profile | wasm raw bytes (baseline → candidate) | gzip-9 bytes (baseline → candidate) | compiled median ns/op (baseline → candidate; candidate min–max) | full median ns/op (baseline → candidate; candidate min–max) |
|---|---:|---:|---:|---:|
| `3` | 346,870 → 345,783 | 141,225 → 140,522 | 3,905.74648 → 2,318.53595 (-40.64%; 2,295.45833–2,336.09659) | 12,701.02049 → 9,676.00383 (-23.82%; 9,652.39220–9,720.00110) |
| `s` | 328,777 → 328,315 | 134,516 → 134,089 | 5,320.73030 → 3,074.90519 (-42.21%; 3,056.70945–3,111.10511) | 15,829.66355 → 11,742.40591 (-25.82%; 11,723.91589–11,929.88180) |
| `z` | 282,511 → 282,653 | 118,831 → 118,621 | 6,620.74623 → 4,204.05388 (-36.50%; 4,179.14011–4,234.00636) | 20,058.99374 → 15,131.61491 (-24.56%; 15,092.33057–15,133.51391) |

The math package retains profile `3`. On this runner, candidate profile `s`
saves 6,433 gzip bytes versus candidate profile `3`, but takes 32.62% longer
for compiled calls and 21.36% longer for the full pipeline. Profile `z` saves
21,901 gzip bytes but takes 81.32% longer for compiled calls and 56.38% longer
for the full pipeline. The smaller profiles therefore have a material runtime
cost on the measured workload.

The base64 rollback is confirmed by this same fresh run: baseline and
candidate have identical WASM SHA-256, raw/gzip sizes, and JS glue size in each
profile. Profile `3` is 31,366 raw / 13,449 gzip bytes, `s` is 32,464 / 14,154,
and `z` is 34,538 / 15,050; all have 8,352 bytes of JS glue. These packages
retain the original base64 release behavior, without the rejected LTO change.

The current run's package hashes are:

```text
math baseline 3: 7b4381a279eef47400ce059181ad5069ba924a68723703bd26ebd67ee05cfab6
math baseline s: bd7527feeff48771423fed786439ddd7d8e4f9784503c9e5e5449312f3af68fe
math baseline z: 933cf0a23456cf26f0a1280a18496a452f88a114a8308835a48f906f279d8f58
math candidate 3: c8ae420077d1dcaba1197519e2e8682213171fd8cde5907f50a0f6a0accceda1
math candidate s: 0a27252adfbcf7bb2c40ed899262de8456ef1def44e2a0c941b31ea5ad28bb04
math candidate z: 5bfbbb2a63cc508f54df005a2d7544805d0a86e744fdfad91d20254eda277c61
base64 baseline 3: 985d3388d09a711614279714fe70200b310c408042645add1ecec19d3103d423
base64 baseline s: 43eb466becd3bfada380f32546b3c5ec1291094ca753a9f7a60698af7618b1d4
base64 baseline z: 04b0af39c988404f6a67bb91c32eefc6340517611d03c9b5745028cfc7c1073b
base64 candidate 3: 985d3388d09a711614279714fe70200b310c408042645add1ecec19d3103d423
base64 candidate s: 43eb466becd3bfada380f32546b3c5ec1291094ca753a9f7a60698af7618b1d4
base64 candidate z: 04b0af39c988404f6a67bb91c32eefc6340517611d03c9b5745028cfc7c1073b
```

<details>
<summary>Current math runtime samples from run 38761955169 (ns/op)</summary>

```text
3 baseline math compiled: [3975.43948, 3926.97161, 3905.74648, 3905.48479, 3899.81329]
3 baseline math full: [12743.41964, 12706.04224, 12701.02049, 12687.73561, 12692.53333]
3 candidate math compiled: [2336.09659, 2329.93720, 2318.53595, 2295.45833, 2299.20738]
3 candidate math full: [9720.00110, 9652.39220, 9676.00383, 9682.81915, 9658.54949]

s baseline math compiled: [5453.68027, 5336.83087, 5318.76338, 5317.38670, 5320.73030]
s baseline math full: [15889.57274, 15827.94138, 15837.30189, 15791.76943, 15829.66355]
s candidate math compiled: [3111.10511, 3074.90519, 3056.70945, 3084.72196, 3063.39653]
s candidate math full: [11723.91589, 11929.88180, 11736.80948, 11743.18348, 11742.40591]

z baseline math compiled: [6671.40170, 6586.55837, 6620.74623, 6649.87864, 6617.87744]
z baseline math full: [20059.91157, 20040.40647, 20058.99374, 20039.45143, 20075.16804]
z candidate math compiled: [4182.39583, 4179.14011, 4204.05388, 4226.83226, 4234.00636]
z candidate math full: [15131.61491, 15133.51391, 15132.57546, 15095.71513, 15092.33057]

```

</details>

### Historical rejected base64 LTO experiment

The following table and samples are retained from run
[38752303306](https://github.com/XiaoXiaoSN/magic-box/actions/runs/38752303306),
artifact `wasm-profile-matrix-38752303306`. They describe the rejected LTO
experiment, not the current base64 package or the current math measurements.
That run used baseline `68ae0495966bf25218c03102588049bdbd450be2` and synthetic
candidate `e4efcd6a58abfcd30806fa268d6cd536f68d4708`, combining source commit
`88418399fe4d27411c8aa2ccfa029137d08e75cb` with the base. Its runtime and size
measurements used the same runner within that job, but its tool executable
hashes are diagnostic only: it selected wasm-bindgen/wasm-opt after building
and hashed rustup proxy paths for rustc/cargo.

| base64 profile | wasm raw bytes (baseline → candidate) | gzip-9 bytes (baseline → candidate) | encode median ns/op (baseline → candidate; candidate min–max) | decode-to-string median ns/op (baseline → candidate; candidate min–max) |
|---|---:|---:|---:|---:|
| `3` | 31,366 → 30,364 | 13,449 → 12,975 | 537.12990 → 686.09686 (+27.73%; 664.47567–695.94845) | 489.73938 → 536.42160 (+9.53%; 522.22444–540.94964) |
| `s` | 32,464 → 31,423 | 14,154 → 13,650 | 615.65210 → 696.72001 (+13.17%; 690.75840–717.75613) | 665.47293 → 883.00667 (+32.69%; 869.38889–888.13523) |
| `z` | 34,538 → 33,515 | 15,050 → 14,551 | 690.60280 → 771.31237 (+11.69%; 766.38903–801.65836) | 876.09727 → 1,121.10933 (+27.97%; 1,118.49919–1,131.69414) |

The rejected profile-3 experiment saved 474 gzip bytes (3.52%) but added
1,461 JS-glue bytes and slowed encode by 27.73% and decode by 9.53%. Its
release-profile change was removed; the fresh run above verifies the rollback.
The historical candidate hashes identify only the rejected LTO packages:

```text
base64 candidate 3: 7125c2d964b4a4b5e29be8d63c6d697a772a91cbd062b7c25f2b1bca937b1808
base64 candidate s: 43b8dba772d1829b5edfd1db4f5e9f36a72d6d89513998a8332f071e5a46efe2
base64 candidate z: 8c514accaf41ca599257c7afb3dfc68a0b36857280af16c76649ce3ff78dcce8
```

<details>
<summary>Historical base64 runtime samples from run 38752303306 (ns/op)</summary>

```text
3 baseline base64 encode:  [550.58564, 537.12990, 538.05790, 531.18823, 536.03555]
3 candidate base64 encode:  [695.03677, 664.47567, 686.09686, 671.89949, 695.94845]
3 baseline base64 decode:  [490.32026, 486.12652, 480.28580, 489.73938, 493.00211]
3 candidate base64 decode:  [522.22444, 540.46121, 535.96130, 540.94964, 536.42160]

s baseline base64 encode:  [615.65210, 630.27291, 608.88807, 630.76635, 608.96158]
s candidate base64 encode:  [717.75613, 702.88974, 696.72001, 690.75840, 691.15340]
s baseline base64 decode:  [651.42770, 665.47293, 662.01810, 680.03435, 684.72274]
s candidate base64 decode:  [869.38889, 883.00667, 873.25853, 888.13523, 887.42115]

z baseline base64 encode:  [727.67065, 688.29701, 722.84815, 686.07435, 690.60280]
z candidate base64 encode:  [801.65836, 767.93567, 792.86306, 771.31237, 766.38903]
z baseline base64 decode:  [921.95982, 880.81290, 862.44282, 876.09727, 862.81348]
z candidate base64 decode:  [1121.10933, 1131.69414, 1118.49919, 1119.37511, 1124.25840]

```

</details>
