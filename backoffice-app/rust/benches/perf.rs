use criterion::{criterion_group, criterion_main, Criterion};
use backoffice_rust::compute_delta;

fn bench_delta(c: &mut Criterion) {
    let a = vec![1u8; 10_000];
    let mut b = a.clone();
    for i in (0..10_000).step_by(1000) { b[i] = 2; }
    c.bench_function("compute_delta", |bencher| bencher.iter(|| compute_delta(&a, &b)));
}

criterion_group!(benches, bench_delta);
criterion_main!(benches);