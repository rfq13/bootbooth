export function isValidEmail(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) }
export function isValidPassword(v: string) { return /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(v) }