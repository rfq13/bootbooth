import { useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { loginAdmin } from '../utils/api'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [remember, setRemember] = useState(true)
  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), [email])
  const passwordValid = useMemo(() => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password), [password])
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!emailValid) { setError('Email tidak valid'); return }
    if (!passwordValid) { setError('Password minimal 8 karakter, kombinasi huruf & angka'); return }
    setLoading(true)
    setError(null)
    try {
      const res = await loginAdmin(email, password)
      login(res.token, res.role, remember)
      nav('/dashboard')
    } catch {
      setError('Login gagal')
    } finally { setLoading(false) }
  }
  return (
    <div className="w-full max-w-md">
      <form onSubmit={onSubmit as any}>
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Masuk Admin</h3>
          <div className="grid gap-3">
            <label className="grid gap-1">
              <span className="text-sm">Email</span>
              <Input aria-label="Email" value={email} onChange={e => setEmail((e.target as HTMLInputElement).value)} />
            </label>
            <label className="grid gap-1">
              <span className="text-sm">Password</span>
              <Input aria-label="Password" type="password" value={password} onChange={e => setPassword((e.target as HTMLInputElement).value)} />
            </label>
            <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={remember} onChange={e => setRemember((e.target as HTMLInputElement).checked)} /> Remember Me</label>
            {error && <span className="text-[#ef4444] text-sm" role="alert">{error}</span>}
            <Button aria-busy={loading} disabled={loading}>{loading ? 'Memuat...' : 'Masuk'}</Button>
            <a className="text-sm text-[#0ea5e9]" href="mailto:support@example.com?subject=Reset%20Password">Forgot Password?</a>
          </div>
        </Card>
      </form>
    </div>
  )
}