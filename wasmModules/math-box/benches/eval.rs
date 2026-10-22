use std::hint::black_box;

use criterion::{Criterion, criterion_group, criterion_main};
use math_box::{Compiled, evaluate};

const USER_FN_EXPR: &str =
    "f(a, b, c, d) = (a + b) * (c + d) + a^2 + b^2 + c^2 + d^2 + (a - b) * (c - d); f(1, 2, 3, 4)";

fn bench_full_pipeline(c: &mut Criterion) {
    let cases = [
        ("simple", "1 + 2 * 3"),
        ("medium", "2 + 2^10 + log(10, 10000)"),
        ("trig", "sin(PI/2) + cos(PI/3)"),
        ("hex", "0xff + 0b1010"),
        ("factorial", "5! + 10!"),
        ("nested", "(((1 + 2) * 3 - 4) / 5) ^ 2"),
    ];

    let mut group = c.benchmark_group("evaluate");
    for (name, expr) in cases {
        group.bench_function(name, |b| b.iter(|| evaluate(black_box(expr))));
    }
    group.finish();
}

fn bench_compiled_user_fn(c: &mut Criterion) {
    let compiled = Compiled::new(USER_FN_EXPR).expect("compile benchmark expression");
    let mut group = c.benchmark_group("compiled");
    group.bench_function("user_fn", |b| {
        b.iter(|| black_box(compiled.evaluate().expect("compiled evaluation")))
    });
    group.finish();
}

criterion_group!(benches, bench_full_pipeline, bench_compiled_user_fn);
criterion_main!(benches);
