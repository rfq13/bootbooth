const devFallback = (() => {
  if (typeof window === 'undefined') return ''
  const p = window.location.port
  return ['5192','5194','5200','5202','5210','5212'].includes(p) ? 'http://localhost:3002' : ''
})()
const base = (import.meta.env.VITE_API_BASE_URL || devFallback)
import { token } from '../hooks/useAuth'
function getCookie(name: string) {
  if (typeof document === 'undefined') return ''
  const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : ''
}

async function apiFetch(path: string, init?: RequestInit) {
  const csrf = getCookie('csrf_token')
  const res = await fetch(base + path, {
    headers: { 'Content-Type': 'application/json', ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}), ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...(init?.headers || {}) },
    ...init
  })
  const isJson = (res.headers.get('content-type') || '').includes('application/json')
  if (!res.ok) {
    const err = isJson ? await res.json().catch(() => ({})) : await res.text().catch(() => '')
    const msg = typeof err === 'string' ? err : (err?.error || 'Request failed')
    throw new Error(msg)
  }
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) return res.json()
  return res.text()
}

export function loginAdmin(email: string, password: string) {
  return apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
}
export function listOutlets() { return apiFetch('/outlets') }
export function listAdminUsers() { return apiFetch('/admin-users') }
export function listBookings(params?: { status?: string }) {
  const q = params?.status ? `?status=${encodeURIComponent(params.status)}` : ''
  return apiFetch('/bookings' + q)
}
export function getSessionStatus(id: string) { return apiFetch(`/session/${id}/status`) }
export function overrideSession(id: string, by: string) {
  return apiFetch(`/session/${id}/override`, { method: 'POST', body: JSON.stringify({ admin_id: by }) })
}

export function getSystemConfig() { return apiFetch('/config/system') }
export function updateSystemConfig(sessionMinutes: number, toleranceMinutes: number) {
  const body = new URLSearchParams({ session_duration_minutes: String(sessionMinutes), arrival_tolerance_minutes: String(toleranceMinutes) })
  return apiFetch('/config/system', { method: 'PUT', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
}

export function createBooking(userName: string, outletName: string) {
  return apiFetch('/booking', { method: 'POST', body: JSON.stringify({ user_name: userName, outlet_name: outletName }) })
}
export function confirmPayment(bookingId: string) {
  return apiFetch('/payment/confirm', { method: 'POST', body: JSON.stringify({ booking_id: bookingId }) })
}
export function arrivalSession(id: string) { return apiFetch('/session/arrival', { method: 'POST', body: JSON.stringify({ id }) }) }
export function startSession(id: string) { return apiFetch('/session/start', { method: 'POST', body: JSON.stringify({ id }) }) }
export function finishSession(id: string) { return apiFetch('/session/finish', { method: 'POST', body: JSON.stringify({ id }) }) }

export function assertArray(v: any, name: string) { if (!Array.isArray(v)) throw new Error(`${name} invalid`) }
export function assertObject(v: any, name: string) { if (typeof v !== 'object' || !v) throw new Error(`${name} invalid`) }