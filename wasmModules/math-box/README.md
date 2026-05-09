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
- **Units**: `1 km + 500 m to m` → `1500 m`; SI length / mass / time tables
  with dimension checking
- **Number bases**: decimal, hex (`0xFF`), binary (`0b1010`), octal (`0o17`)

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
| 200 | literals, variables |
| 190 | function calls |
| 120 | exponent `^` |
| 110 | unary `-`, `!` |
| 100 | `*`, `/`, `%` |
| 95  | `+`, `-` |
| 80  | `<`, `>`, `<=`, `>=`, `==`, `!=` |
| 75  | `&&` |
| 70  | `\|\|` |
| 50  | `=`, compound assignment |
| 40  | tuple `,` |
| 0   | statement `;` |

### Value types

```rust
pub enum Value {
    Int(i64),
    Float(f64),
    Bool(bool),
    Str(String),
    Big(BigInt),        // feature = "bigint"
    Frac(num, den),     // feature = "fraction"
    Complex(re, im),
    Unit(value, label),
    Empty,
}
```

`Int op Int` promotes to `Float` (or `Big` with the `bigint` feature) on
overflow, so users do not lose precision silently.

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

A `Compiled` handle for incremental re-evaluation against changing
namespaces is planned but not yet exposed.

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
`123n`).

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
9007199254740993n + 1n               → 9007199254740994n
frac(1, 3) + frac(1, 4)              → 7/12
complex(1, 2) * complex(3, 4)        → -5+10i
1 km + 500 m to m                    → 1500 m
3 kg to g                            → 3000 g
f(x) = x^2; f(5)                     → 25
```

---

## Testing

- `cargo test` — unit + integration tests
- `wasm-bindgen-test` — headless browser smoke tests
- `proptest` — random expression generation, must not panic
- `cargo fuzz` — lexer / parser robustness
- TS side: `MathExpressionBoxSource.test.ts` runs unchanged against the
  new backend

---

## Benchmarks

`cargo bench` produces a Criterion report under
`target/criterion/report/index.html`. Tracked samples cover short
arithmetic, mid-depth expressions, trig + constants, multi-variable
namespaces, and repeated eval against a precompiled program.

WASM-side comparisons against `mathjs` (cold import, hot loop, cold loop)
live in [`BENCHMARK.md`](./BENCHMARK.md), updated per phase. PRs that
regress the hot path by more than 10% must justify the cost.
