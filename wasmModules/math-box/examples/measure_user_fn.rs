use std::hint::black_box;
use std::time::Instant;

use math_box::{Compiled, evaluate};

const ITERATIONS: usize = 100_000;
const RUNS: usize = 9;
const WARMUP: usize = 10_000;
const USER_FN_EXPR: &str =
    "f(a, b, c, d) = (a + b) * (c + d) + a^2 + b^2 + c^2 + d^2 + (a - b) * (c - d); f(1, 2, 3, 4)";

fn measure<F>(mut call: F) -> Vec<u128>
where
    F: FnMut(),
{
    for _ in 0..WARMUP {
        call();
    }

    (0..RUNS)
        .map(|_| {
            let start = Instant::now();
            for _ in 0..ITERATIONS {
                call();
            }
            start.elapsed().as_nanos()
        })
        .collect()
}

fn report(label: &str, samples: &[u128]) {
    let mut sorted = samples.to_vec();
    sorted.sort_unstable();
    let median = sorted[sorted.len() / 2] as f64 / ITERATIONS as f64;
    println!("{label}: median {median:.5} ns/op; samples {samples:?} ns / {ITERATIONS} calls");
}

fn main() {
    let compiled = Compiled::new(USER_FN_EXPR).expect("compile benchmark expression");
    assert_eq!(compiled.evaluate().expect("compiled evaluation"), "52");
    assert_eq!(evaluate(USER_FN_EXPR).expect("full evaluation"), "52");

    let compiled_samples = measure(|| {
        black_box(compiled.evaluate().expect("compiled evaluation"));
    });
    let full_samples = measure(|| {
        black_box(evaluate(USER_FN_EXPR).expect("full evaluation"));
    });

    println!("iterations: {ITERATIONS}; runs: {RUNS}; warmup: {WARMUP}");
    report("compiled", &compiled_samples);
    report("full", &full_samples);
}
