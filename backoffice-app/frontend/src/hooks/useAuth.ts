import { signal, computed } from '@preact/signals-react'

export const token = signal<string | null>(null)
export const role = signal<'admin' | 'super_admin' | 'user' | null>(null)
const LS_KEY = 'backoffice_auth'
const SS_KEY = 'backoffice_auth_session'
try {
  const raw = localStorage.getItem(LS_KEY) || sessionStorage.getItem(SS_KEY)
  if (raw) {
    const v = JSON.parse(raw)
    token.value = v.token || null
    role.value = v.role || null
  }
} catch {}
function decodeClaims(t: string | null): any {
  try {
    if (!t) return null
    const parts = t.split('.')
    if (parts.length !== 3) return null
    const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch { return null }
}
function isExpired(t: string | null): boolean {
  const c = decodeClaims(t)
  if (!c || !c.exp) return false
  return Math.floor(Date.now()/1000) > Number(c.exp)
}
export function useAuth() {
  const isAuthenticated = computed(() => !!token.value && !isExpired(token.value))
  function login(t: string, r: 'admin' | 'super_admin' | 'user', remember = true) {
    token.value = t; role.value = r
    const payload = JSON.stringify({ token: t, role: r })
    if (remember) { localStorage.setItem(LS_KEY, payload); sessionStorage.removeItem(SS_KEY) }
    else { sessionStorage.setItem(SS_KEY, payload); localStorage.removeItem(LS_KEY) }
  }
  function logout() { token.value = null; role.value = null; localStorage.removeItem(LS_KEY); sessionStorage.removeItem(SS_KEY) }
  if (isExpired(token.value)) logout()
  return { token, role, isAuthenticated, login, logout }
}
