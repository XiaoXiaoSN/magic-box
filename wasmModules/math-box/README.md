# math-box

A small, fast math expression evaluator written in Rust and compiled to
WebAssembly. Built as a drop-in replacement for `mathjs` in the
[magic-box](../../) project, with comparable feature coverage at a fraction
of the bundle size.

---

## Features

- **Arithmetic**: `+`, `-`, `*`, `/`, `%`, `^`, unary `-`, postfix `!` (factorial)
- **Comparison & logic**: `<`, `>`, `<=`, `>=`, `==`, `!=`, `&&`, `||`, prefix `!`
- **Built-in functions**: `sin/cos/tan/asin/acos/atan/atan2`, `sinh/cosh/tanh`,
  `ln/log/log2/log10`, `exp`, `sqrt/cbrt`, `abs/floor/ceil/round`, `min/max`,
  `pow`, `hypot`
- **Constants**: `PI`, `pi`, `E`, `e`, `Infinity`, `NaN`, `i`
- **Variables and statements**: `x = 1; x + 2`
- **User-defined functions**: `f(x) = x^2; f(5)`
- **BigInt**: arbitrary-precision integers via `123n` literals or `big(...)`
- **Fractions**: exact rationals via `frac(num, den)`; auto-simplified
- **Complex numbers**: `complex(re, im)`, `i`, full arithmetic + `re/im/conj/arg/abs`
- **Units**: `1 km + 500 m to m` → `1500 m`; dimension checked length, mass,
  time, temperature, and data units, including derived and composite units
  such as `km/h`, `m^2`, `MB`, and `GiB`
- **Number bases**: decimal, hex (`0xFF`), binary (`0b1010`), octal (`0o17`)

### Numeric exactness

Plain decimal and radix integer literals above the safe `f64` integer range are
parsed as `BigInt` automatically. An `n` suffix also requests `BigInt`, and is
recognized only at an identifier boundary, so unit labels such as `2ns` and
`2nm` remain valid. BigInt remainder, power, and factorial operations stay
exact and use the crate's numeric bit and display limits. Mixing a BigInt with
an inexact floating number returns a type error rather than converting the
integer through `f64`.

With the `bigint` feature enabled, integral `Num` and `Fraction` factorial
operands use the same bounded BigInt backend as `n`-suffixed values.
Fraction/BigInt arithmetic remains exact in either operand order, and
nonnegative integral fraction exponents use bounded exact powers; unsupported
inexact combinations return a type error.

`%` uses floored modulo: the result has the divisor's sign, and a zero divisor
returns the dividend. Fractions retain their BigInt numerator and denominator
backend, including when an integral floating input is converted; the input's
existing `f64` approximation is preserved. Scientific floating values keep
scientific notation at JavaScript-style magnitude thresholds (`1e300` renders
as `1e+300`).

---

## Pipeline

```
source → lex → parse (Pratt) → compile (constant folding) → vm → value
```

- **Lexer** tokenizes numbers, identifiers, operators, string literals.
- **Parser** is a Pratt parser with the precedence table below.
- **Compiler** lowers the AST into a flat instruction stream and folds
  constant subtrees at compile time.
- **VM** executes the instruction stream against a stack — no recursion,
  cache-friendly, safe under WASM stack limits.

### Precedence

| precedence | category |
|---|---|
| 10  | `\|\|` |
| 20  | `&&` |
| 30  | `==`, `!=` |
| 40  | `<`, `>`, `<=`, `>=` |
| 60  | unit conversion `to` |
| 95  | `+`, `-` |
| 100 | `*`, `/`, infix `%` |
| 110 | unary `-`, `!` |
| 121 | exponent `^` |
| 130 | postfix `%`, `!` |

`&&` and `||` require boolean operands and short-circuit the right-hand side.
The percent token is postfix at the end of an expression, before a closing
delimiter, or before `of` (`10% of 200`); otherwise it remains modulo.

### Value types

```rust
pub enum Value {
    Num(f64),
    Bool(bool),
    Str(String),
    Big(BigInt),        // feature = "bigint"
    Frac(Fraction),     // feature = "fraction"
    Complex(re, im),
    Unit(UnitValue),
}
```

Integral numeric literals beyond the safe `f64` range are represented as
`BigInt` when the `bigint` feature is enabled, so users do not lose precision
silently.

Unit values retain their base value, dimension exponents, display scale, and
display label. Arithmetic combines those fields instead of converting a
composite value back through an atomic-unit lookup. Affine temperatures use
`K`, `degC`/`°C`, and `degF`/`°F`; invalid absolute temperatures and affine
multiplication, division, and powers return errors.

---

## Crate layout

```
wasmModules/math-box/
├── Cargo.toml          # crate-type = ["cdylib", "rlib"]
├── src/
│   ├── lib.rs          # #[wasm_bindgen] public API
│   ├── value.rs        # Value enum + promotion rules
│   ├── lexer.rs        # source → tokens
│   ├── parser.rs       # tokens → AST (Pratt)
│   ├── compiler.rs     # AST → flat instructions (with constant folding)
│   ├── vm.rs           # instruction stream executor
│   ├── namespace.rs    # variable / function lookup
│   ├── builtins.rs     # built-in functions and constants
│   ├── units.rs        # SI unit tables and dimension checks
│   ├── ops.rs          # arithmetic dispatch across Value variants
│   ├── limits.rs       # parse / eval safety caps
│   └── error.rs        # ParseError, CompileError, RuntimeError
├── tests/
│   └── integration.rs
└── benches/
    └── eval.rs
```

Each error type is module-local with its own `Result` alias; `Display` is
hand-written rather than derived.

---

## Public API

```rust
#[wasm_bindgen]
pub fn evaluate(input: &str) -> Result<String, String>;
```

One-shot parse + compile + eval. Errors are stringified for the JS side.

```rust
pub struct TypedResult {
    // `num`, `big`, `fraction`, `complex`, `unit`, `bool`, `string`, or `function`.
    kind: String,
    text: String,
    exact: bool,
    finite: bool,
}

pub fn evaluate_typed(input: &str) -> Result<TypedResult, String>;

pub struct Compiled { /* bounded compiled program */ }
```

`evaluate` remains the compatibility string API. `evaluate_typed` exposes the
runtime kind, formatted text, exactness for BigInt/fraction results, and a
finite flag. `Compiled::new`, `evaluate`, `evaluate_typed`, and `free` provide
reusable compiled programs; every evaluation starts with a fresh scope and
work budget.

---

## Safety limits

User input from the web is untrusted, so the evaluator enforces caps:

| limit | default |
|---|---|
| expression length | 4 KB |
| nesting depth | 32 |
| value count | 64 |
| sub-expression count | 64 |

Exceeding any cap returns a structured `ParseError` rather than panicking.

---

## Cargo features

| feature | runtime deps | purpose |
|---|---|---|
| `default` | `std`, `wasm` | normal browser build |
| `std` | — | use `f64::sin` etc. |
| `wasm` | `wasm-bindgen` | JS-friendly API |
| `bigint` | `num-bigint`, `num-traits` | arbitrary-precision integers |
| `fraction` | `num-rational`, `num-integer`, `num-traits` | exact rationals (uses `BigInt` when `bigint` is on) |
| `unit` | — | unit system, no extra deps |

Runtime dependencies are kept to a minimum: outside `wasm-bindgen` and the
opt-in numeric backends, the crate has none. Dev-dependencies (`criterion`,
`wasm-bindgen-test`, `proptest`) never reach `pkg/*.wasm`.

---

## Integration with magic-box

`MathExpressionBoxSource.ts` lazy-imports `math-box` in place of `mathjs`.
The `MATH_SHAPE` regex pre-filter accepts the new syntax (`1 km`, `to`,
`123n`, comparisons, and logical operators). The source uses typed results to
ignore strings, function definitions, non-finite numbers, dates, phone-like
numeric groups, and bare unit literals during automatic matching. `::math` and
`::math=<expr>` explicitly enable or replace the expression.

```jsonc
// package.json
{
  "dependencies": {
    "math-box": "file:wasmModules/math-box/pkg"
  }
}
```

Build with `bun run build:wasm` from the repo root.

---

## Examples

```text
1000 + 2000                          → 3000
2 * (3 + 4)                          → 14
2 + 2^10 + log(10, 10000)            → 1026.25
sin(PI/2)                            → 1
9007199254740993n + 1n               → 9007199254740994
frac(1, 3) + frac(1, 4)              → 7/12
complex(1, 2) * complex(3, 4)        → -5+10i
1 km + 500 m to m                    → 1500 m
3 kg to g                            → 3000 g
10 km / 2 h                         → 5 km/h
0 degC to degF                       → 32 degF
10% of 200                           → 20
f(x) = x^2; f(5)                     → 25
```

---

## Testing

- `cargo test` — unit + integration tests
- `wasm-bindgen-test` — headless browser smoke tests for the generated package
- `proptest` — random expression generation, must not panic
- `cargo fuzz` — lexer / parser robustness
- TS side: `MathExpressionBoxSource.test.ts` and the recovery tests cover
  automatic matching, explicit math options, negative gates, and retry paths

---

## Benchmarks

`cargo bench` produces a Criterion report under
`target/criterion/report/index.html`. Tracked samples cover short
arithmetic, mid-depth expressions, trig + constants, multi-variable
namespaces, and repeated eval against a precompiled program.

WASM-side comparisons against `mathjs` (cold import, hot loop, cold loop)
live in [`BENCHMARK.md`](./BENCHMARK.md), updated per phase. PRs that
regress the hot path by more than 10% must justify the cost.
