import { describe, it, expect } from 'vitest'
import { isValidEmail, isValidPassword } from '../utils/validation'

describe('validation', () => {
  it('validates email', () => {
    expect(isValidEmail('a@b.com')).toBe(true)
    expect(isValidEmail('bad')).toBe(false)
  })
  it('validates password', () => {
    expect(isValidPassword('abc12345')).toBe(true)
    expect(isValidPassword('short')).toBe(false)
    expect(isValidPassword('onlylettersabcdefgh')).toBe(false)
  })
})