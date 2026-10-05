# math-box

A Rust expression evaluator compiled to WebAssembly for [Magic Box](../../).
It implements the syntax below; it is not a complete replacement for the
mathjs language. Implementation references: [lexer](src/lexer.rs),
[parser](src/parser.rs), [builtins](src/builtins.rs) and [values](src/value.rs).

## Supported syntax

- Arithmetic: `+`, `-`, `*`, `/`, `%`, `^`, unary `+`/`-`, postfix `!` (factorial).
- Prefix `!` is logical negation: `!0` returns `1`, and `!1` returns `0`.
- Decimal, hexadecimal (`0xff`), binary (`0b1010`) and octal (`0o17`) numbers.
- Parentheses, function calls, variables and semicolon-separated statements:
  `x = 1; x + 2`.
- User functions: `f(x) = x^2; f(5)`.
- BigInt literals with an `n` suffix, or `big("9007199254740993")`.
- Fractions: `frac(1, 3) + frac(1, 4)` returns `7/12`.
- Complex numbers: `complex(re, im)`, the constant `i`, and arithmetic.
- Units: `1 km + 500 m to m`, `unit(1, "km")`,
  `convert(unit(1, "km"), "m")` and `convert(1, "km", "m")`.
  The [unit table](src/units.rs) covers length, mass and time with dimension
  checks; it is not a general physical-units or temperature engine.
- Quoted strings, used by functions such as `big()` and `unit()`.

Comparison and binary logical operators (`<`, `>`, `<=`, `>=`, `==`, `!=`,
`&&`, `||`), compound assignment and standalone tuples are **not
implemented**. `Value::Bool` exists internally but the expression language
has no boolean literal or comparison operator that produces it.

### Functions and constants

Numeric functions include `sin`, `cos`, `tan`, `asin`, `acos`, `atan`,
`atan2`, `sinh`, `cosh`, `tanh`, `asinh`, `acosh`, `atanh`, `exp`, `ln`,
`log`, `log2`, `log10`, `pow`, `sqrt`, `cbrt`, `floor`, `ceil`, `round`,
`trunc`, `abs`, `sign`, `hypot`, `min`, `max`, `fact`, `gcd` and `lcm`.
`log(x)` is natural logarithm; `log(x, base)` selects a base.

Constants are `PI`/`pi`, `E`/`e`, `TAU`/`tau`, `Infinity`, `NaN`, and `i`
when `complex` is enabled. The feature-dependent functions are `big`, `frac`,
`complex`, `re`, `im`, `conj`, `arg`, `unit` and `convert`.

### Precedence

From tightest to loosest, as implemented in [parser.rs](src/parser.rs):

| Form | Binding power / behavior |
| --- | --- |
| Parentheses, literals, identifiers and calls | Parsed as primary expressions |
| Postfix factorial `!` | 130 |
| Exponent `^` | Left 121, right 120; right-associative |
| Unary `+`, `-`, `!` | 110; `-2^2` means `-(2^2)` |
| `*`, `/`, `%` | Left 100, right 101; left-associative |
| `+`, `-` | Left 95, right 96; left-associative |
| Unit conversion `to` | 60; `1 km + 500 m to m` converts the sum |

Assignments and function definitions are statement forms. Semicolons separate
statements; commas separate function arguments and parameters.

## Numeric behavior

The actual variants in [value.rs](src/value.rs) are `Num(f64)`, `Bool(bool)`,
`Str(String)`, and the feature-gated `Big(BigInt)`, `Frac(Fraction)`,
`Complex(Complex)` and `Unit(UnitValue)`. There is no `Int` or `Empty` variant.

Ordinary numeric literals use IEEE 754 double precision. Integers beyond
`2^53 - 1` can lose precision during parsing or arithmetic; there is no
automatic conversion of ordinary numbers to BigInt. For example,
`9007199254740993 + 1` returns `9007199254740992`.
Use `9007199254740993n + 1n` or a string passed to `big()` for exact large
integers. `big(9007199254740993)` receives an already-rounded number.
BigInt output is decimal text **without** the input's `n` suffix.

Fractions use `num_rational::Ratio`, backed by BigInt when `bigint` is enabled
and `i64` otherwise. Mixed-type arithmetic follows [ops.rs](src/ops.rs):
exact numeric backends do not make arbitrary combinations with floating-point
numbers exact.

## Pipeline and API

```text
source → tokenize → Pratt parser → compiler (constant folding) → stack VM → value
```

The compiler emits a flat instruction stream. The VM iterates through each
program, but calls `exec` recursively for user-function calls, with a bounded
frame stack. The parser and compiler also traverse expression trees
recursively. The default namespace is cached with `OnceLock` in `std` builds;
the source is parsed and compiled again for each evaluation.

```rust
pub fn evaluate(input: &str) -> Result<String, String>;
```

`evaluate` is exported through wasm-bindgen when `wasm` is enabled. Each call
has a fresh variable/function scope and returns the last statement's display
value. Errors come from the shared [Error enum](src/error.rs) and are converted
to strings at this API boundary. There are no separate `ParseError`,
`CompileError` or `RuntimeError` types, and no public compiled JS handle.

## Limits

The enforced constants are in [limits.rs](src/limits.rs) and [vm.rs](src/vm.rs):

| Limit | Value |
| --- | ---: |
| Input length (UTF-8 bytes) | 4096 |
| Parser expression depth | 32 |
| Lexer token cap | 4096 |
| Arguments in a function call | 32 |
| VM scope frames, including the initial frame | 32 |

Limit violations return the corresponding `Error`, such as `InputTooLong`,
`DepthExceeded`, `TooManyTokens` or `ArityMismatch`. The public JS-facing API
returns a string error. These are input/depth caps, not a total instruction or
memory budget. There is no separate 64-value or 64-subexpression limit.

## Cargo features

[Cargo.toml](Cargo.toml) enables **all six** features by default:
`std`, `wasm`, `bigint`, `fraction`, `unit`, `complex`.

| Feature | Dependencies / purpose |
| --- | --- |
| `std` | Standard-library build and cached default namespace |
| `wasm` | `wasm-bindgen`, `console_error_panic_hook`; JS exports and panic diagnostics |
| `bigint` | `num-bigint`, `num-traits`; `n` literals, `big()` and BigInt arithmetic |
| `fraction` | `num-rational`, `num-integer`, `num-traits`; `frac()` and rational arithmetic |
| `unit` | Unit values, the label table, implicit unit literals, `to`, `unit()` and `convert()` |
| `complex` | Complex values, `i`, `complex()` and complex helpers |

Use `--no-default-features --features "..."` to select a subset. Disabling
`unit` removes the whole unit facility, not only a conversion helper.
`criterion` and `wasm-bindgen-test` are dev-dependencies; `proptest` is not.

## Build and examples

From the repository root, with Rust and wasm-pack installed:

```sh
bun run build:wasm
bun install --frozen-lockfile
```

The app depends on `math-box` via `file:wasmModules/math-box/pkg`.
`MathExpressionBoxSource` lazy-loads it and memoizes successful results at the
application layer; that cache is not part of the evaluator benchmark.

```text
1000 + 2000                     → 3000
2 * (3 + 4)                     → 14
2 + 2^10 + log(10, 10000)        → 1026.25
sin(PI/2)                       → 1
9007199254740993n + 1n          → 9007199254740994
frac(1, 3) + frac(1, 4)          → 7/12
complex(1, 2) * complex(3, 4)    → -5+10i
1 km + 500 m to m               → 1500 m
3 kg to g                      → 3000 g
f(x) = x^2; f(5)                → 25
```

## Validation and benchmarks

```sh
cd wasmModules/math-box
cargo test
cargo bench --no-default-features --features "std bigint fraction unit complex"
# From the repository root, after building/installing the WASM packages:
node wasmModules/math-box/bench/compare.mjs
bun run test --run src/modules/boxSources/__test__/MathExpressionBoxSource.test.ts
```

Current Rust coverage lives in [tests/integration.rs](tests/integration.rs).
Although `wasm-bindgen-test` is declared and the repository has a generic WASM
workflow, this crate currently has no `#[wasm_bindgen_test]` tests. It also has
no proptest suite or cargo-fuzz target. The TypeScript tests exercise the app's
Math source; they are not evidence of browser fuzzing coverage.

[benches/eval.rs](benches/eval.rs) benchmarks six full-pipeline cases: simple,
medium, trig, hex, factorial and nested expressions. It does not benchmark a
precompiled handle. See [BENCHMARK.md](BENCHMARK.md) for a dated WASM-versus-JS
measurement, its exact artifact and the reproduction command.
