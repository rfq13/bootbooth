use once_cell::sync::Lazy;
use std::sync::Mutex;

static COUNTER: Lazy<Mutex<u64>> = Lazy::new(|| Mutex::new(0));

#[no_mangle]
pub extern "C" fn ffi_increment() -> u64 {
    let mut c = COUNTER.lock().unwrap();
    *c += 1;
    *c
}

#[no_mangle]
pub extern "C" fn ffi_reset() {
    let mut c = COUNTER.lock().unwrap();
    *c = 0;
}

pub fn compute_delta(a: &[u8], b: &[u8]) -> usize {
    let mut diff = 0usize;
    let len = a.len().min(b.len());
    for i in 0..len { if a[i] != b[i] { diff += 1 } }
    diff + a.len().saturating_sub(len) + b.len().saturating_sub(len)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn delta_basic() { assert_eq!(compute_delta(b"abc", b"axc"), 1); }
    #[test]
    fn ffi_counter() { ffi_reset(); assert_eq!(ffi_increment(), 1); assert_eq!(ffi_increment(), 2); }
}