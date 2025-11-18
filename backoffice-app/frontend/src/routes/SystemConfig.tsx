import { useEffect, useState } from 'react'
import { getSystemConfig, updateSystemConfig } from '../utils/api'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'

export default function SystemConfig() {
  const [sessionMinutes, setSessionMinutes] = useState<number>(20)
  const [toleranceMinutes, setToleranceMinutes] = useState<number>(15)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [info, setInfo] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setLoading(true)
    getSystemConfig().then((v: any) => {
      if (v.session_duration_minutes) setSessionMinutes(Number(v.session_duration_minutes))
      if (v.arrival_tolerance_minutes) setToleranceMinutes(Number(v.arrival_tolerance_minutes))
    }).catch(() => setError('Gagal memuat')).finally(() => setLoading(false))
  }, [])
  async function save() {
    setSaving(true)
    setError(null)
    setInfo('')
    try {
      const v = await updateSystemConfig(sessionMinutes, toleranceMinutes)
      setInfo('Tersimpan')
      if (v.session_duration_minutes) setSessionMinutes(Number(v.session_duration_minutes))
      if (v.arrival_tolerance_minutes) setToleranceMinutes(Number(v.arrival_tolerance_minutes))
    } catch { setError('Gagal menyimpan') }
    finally { setSaving(false) }
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-semibold">System Config</h2></div>
      <Card className="p-4">
        {loading && <div>Memuat...</div>}
        <div className="grid lg:grid-cols-2 gap-3">
          <label className="grid gap-1">
            <span className="text-sm">Durasi sesi (menit)</span>
            <Input type="number" value={sessionMinutes} onChange={e => setSessionMinutes(Number((e.target as HTMLInputElement).value))} />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Toleransi terlambat (menit)</span>
            <Input type="number" value={toleranceMinutes} onChange={e => setToleranceMinutes(Number((e.target as HTMLInputElement).value))} />
          </label>
        </div>
        <div className="flex gap-2 mt-3"><Button disabled={saving} onClick={save as any}>{saving ? 'Menyimpan...' : 'Simpan'}</Button></div>
        {info && <div className="text-[#22c55e]">{info}</div>}
        {error && <div className="text-[#ef4444]">{error}</div>}
      </Card>
    </div>
  )
}