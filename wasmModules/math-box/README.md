# math-box

A Rust expression evaluator compiled to WebAssembly for [Magic Box](../../).
It implements the syntax below; it is not a complete replacement for the
mathjs language. Implementation references: [lexer](src/lexer.rs),
[parser](src/parser.rs), [builtins](src/builtins.rs) and [values](src/value.rs).

## Supported syntax

- Arithmetic: `+`, `-`, `*`, `/`, `%`, `^`, unary `+`/`-`, postfix `!` (factorial).
- Comparisons: `<`, `>`, `<=`, `>=`, `==` and `!=` return booleans.
- Boolean literals `true` and `false`, logical `&&`/`||` with short-circuiting,
  and prefix `!` for boolean negation. Logical operators require boolean
  operands; `!1` and `1 && true` are errors.
- Calculator-style implicit multiplication: `2 pi`, `2(3 + 4)` and
  `(2 + 1)(4 + 1)`.
- Percent postfix and percentage-of syntax: `50%` is `0.5`, and `10% of 200`
  is `20`. A percent between arithmetic operands remains modulo, as in
  `50 % -3`.
- Decimal, hexadecimal (`0xff`), binary (`0b1010`) and octal (`0o17`) numbers.
- Parentheses, function calls, variables and semicolon-separated statements:
  `x = 1; x + 2`.
- User functions: `f(x) = x^2; f(5)`.
- BigInt literals with an `n` suffix, or `big("9007199254740993")`. Large
  integer literals such as `9007199254740993` are promoted to the exact BigInt
  backend when the `bigint` feature is enabled.
- Fractions: `frac(1, 3) + frac(1, 4)` returns `7/12`.
- Complex numbers: `complex(re, im)`, the constant `i`, and arithmetic.
- Units: `(1 km + 500 m) to m`, `unit(1, "km")`,
  `convert(unit(1, "km"), "m")` and `convert(1, "km", "m")`.
  The [unit table](src/units.rs) covers length, mass, time, temperature, data
  size and common derived SI units, with dimensional checks and affine Celsius
  and Fahrenheit conversion.
- Quoted strings, used by functions such as `big()` and `unit()`.

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
| Implicit multiplication | 100; adjacent primary expressions such as `2 pi` and `2(3 + 4)` |
| `*`, `/`, `%` | Left 100, right 101; left-associative |
| `+`, `-` | Left 95, right 96; left-associative |
| Unit conversion `to` | 60; parenthesize a compound value, as in `(1 km + 500 m) to m` |
| Comparisons `<`, `>`, `<=`, `>=` | Left 40, right 41 |
| Equality `==`, `!=` | Left 30, right 31 |
| Logical `&&` | Left 20, right 21; short-circuiting |
| Logical `||` | Left 10, right 11; short-circuiting |

Assignments and function definitions are statement forms. Semicolons separate
statements; commas separate function arguments and parameters.

## Numeric behavior

The actual variants in [value.rs](src/value.rs) are `Num(f64)`, `Bool(bool)`,
`Str(String)`, and the feature-gated `Big(BigInt)`, `Frac(Fraction)`,
`Complex(Complex)` and `Unit(UnitValue)`. There is no `Int` or `Empty` variant.

Ordinary numeric literals use IEEE 754 double precision until the lexer sees an
integer that cannot be represented exactly. With `bigint` enabled, such
integer literals are kept in the BigInt backend, so
`9007199254740993 + 1` returns `9007199254740994`. An `n` suffix is still the
explicit form for exact integer input, and `big()` accepts an integer-valued
number or string. Fractional values and non-integer BigInt mixes follow the
type rules in [ops.rs](src/ops.rs). BigInt output is decimal text **without**
the input's `n` suffix.

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
the source is parsed and compiled again for each `evaluate` call.

```rust
pub fn evaluate(input: &str) -> Result<String, String>;
pub fn evaluate_typed(input: &str) -> Result<TypedResult, String>;
pub struct Compiled { /* compiled expression */ }
impl Compiled {
    pub fn new(input: &str) -> Result<Self, String>;
    pub fn evaluate(&self) -> Result<String, String>;
    pub fn evaluate_typed(&self) -> Result<TypedResult, String>;
}
```

`evaluate` and `evaluate_typed` are exported through wasm-bindgen when `wasm`
is enabled. Each top-level call has a fresh variable/function scope and returns
the last statement's display value. `TypedResult` exposes `kind`, `text`,
`exact` and `finite`; the kind is one of `num`, `bool`, `string`, `function`,
`big`, `fraction`, `complex` or `unit`. `Compiled::new` parses and compiles
once, while each `Compiled.evaluate*` call creates a fresh scope and budget.
Errors come from the shared [Error enum](src/error.rs) and are converted to
strings at this API boundary.

## Limits

The enforced constants are in [limits.rs](src/limits.rs) and [vm.rs](src/vm.rs):

| Limit | Value |
| --- | ---: |
| Input length (UTF-8 bytes) | 4096 |
| Parser expression depth | 32 |
| AST height | 256 |
| Lexer token cap | 4096 |
| Arguments in a function call | 32 |
| Evaluation steps (compile and execution) | 10,000 |
| BigInt/fraction numeric bit length | 16,384 |
| Rendered display length | 4096 |
| VM scope frames, including the initial frame | 32 |

Limit violations return the corresponding `Error`, such as `InputTooLong`,
`DepthExceeded`, `TooManyTokens`, `ArityMismatch` or `LimitExceeded`. A normal
`evaluate` call shares the evaluation-step budget between compilation and VM
execution. A `Compiled` expression has a compile budget and a fresh execution
budget for each call. Numeric growth and rendered output are checked before
results cross the public API. The public JS-facing API returns a string error.

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
1 < 2                           → true
2 pi                            → 6.283185307179586
2(3 + 4)                        → 14
50%                             → 0.5
10% of 200                      → 20
9007199254740993n + 1n          → 9007199254740994
frac(1, 3) + frac(1, 4)          → 7/12
complex(1, 2) * complex(3, 4)    → -5+10i
(1 km + 500 m) to m             → 1500 m
10 m/s to km/h                  → 36 km/h
0 degC to degF                  → 32 degF
3 kg to g                       → 3000 g
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
workflow, this package currently has no `#[wasm_bindgen_test]` tests. It also has
no proptest suite or cargo-fuzz target. The TypeScript tests exercise the app's
Math source; they are not evidence of browser fuzzing coverage.

[benches/eval.rs](benches/eval.rs) benchmarks six full-pipeline cases: simple,
medium, trig, hex, factorial and nested expressions. It does not benchmark a
precompiled handle. See [BENCHMARK.md](BENCHMARK.md) for a dated WASM-versus-JS
measurement, its exact artifact and the reproduction command.
