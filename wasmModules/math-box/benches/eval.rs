use criterion::{Criterion, black_box, criterion_group, criterion_main};
use math_box::evaluate;

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

criterion_group!(benches, bench_full_pipeline);
criterion_main!(benches);
