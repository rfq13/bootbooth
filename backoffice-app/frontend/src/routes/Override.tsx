import { useState } from 'react'
import { overrideSession, getSessionStatus } from '../utils/api'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'

export default function Override() {
  const [sessionId, setSessionId] = useState('')
  const [adminId, setAdminId] = useState('')
  const [result, setResult] = useState<any>(null)
  const [status, setStatus] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  async function checkStatus() { setError(null); try { setStatus(await getSessionStatus(sessionId)) } catch { setError('Gagal cek status') } }
  async function doOverride() { setError(null); try { setResult(await overrideSession(sessionId, adminId)) } catch { setError('Gagal override') } }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-semibold">Override Session</h2></div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="grid gap-3">
            <label className="grid gap-1"><span className="text-sm">Session ID</span><Input value={sessionId} onChange={e => setSessionId((e.target as HTMLInputElement).value)} placeholder="Masukkan ID sesi" /></label>
            <label className="grid gap-1"><span className="text-sm">Admin ID</span><Input value={adminId} onChange={e => setAdminId((e.target as HTMLInputElement).value)} placeholder="Masukkan ID admin" /></label>
            <div className="flex gap-2"><Button onClick={checkStatus as any}>Cek Status</Button><Button onClick={doOverride as any}>Override</Button></div>
            {error && <div className="text-[#ef4444]">{error}</div>}
          </div>
        </Card>
        <Card className="p-4"><h3 className="text-lg font-semibold mb-2">Status</h3><pre>{status ? JSON.stringify(status, null, 2) : 'Belum ada'}</pre></Card>
        <Card className="p-4"><h3 className="text-lg font-semibold mb-2">Hasil</h3><pre>{result ? JSON.stringify(result, null, 2) : 'Belum ada'}</pre></Card>
      </div>
    </div>
  )
}
