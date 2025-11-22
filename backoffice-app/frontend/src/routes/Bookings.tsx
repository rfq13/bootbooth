import { useEffect, useState } from 'react'
import { listBookings, createBooking, confirmPayment, arrivalSession, startSession, finishSession } from '../utils/api'
import { Card } from '../components/ui/card'
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/table'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'

export default function Bookings() {
  const [items, setItems] = useState<any[]>([])
  const [status, setStatus] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string>('')
  const [info, setInfo] = useState<string>('')
  const [newUser, setNewUser] = useState('')
  const [newOutlet, setNewOutlet] = useState('')
  useEffect(() => { load() }, [status])
  function load() {
    setLoading(true)
    listBookings(status ? { status } : undefined).then(setItems).catch(() => setError('Gagal memuat')).finally(() => setLoading(false))
  }
  async function doCreate() { setError(null); setInfo(''); try { const v = await createBooking(newUser, newOutlet); setInfo(`Dibuat ${v.id}`); load() } catch { setError('Gagal membuat booking') } }
  async function doConfirm() { if (!selectedId) return; setError(null); setInfo(''); try { await confirmPayment(selectedId); setInfo('Pembayaran dikonfirmasi'); load() } catch { setError('Gagal konfirmasi pembayaran') } }
  async function doArrival() { if (!selectedId) return; setError(null); setInfo(''); try { await arrivalSession(selectedId); setInfo('Arrival diproses'); load() } catch { setError('Gagal arrival') } }
  async function doStart() { if (!selectedId) return; setError(null); setInfo(''); try { await startSession(selectedId); setInfo('Sesi dimulai'); load() } catch { setError('Gagal mulai') } }
  async function doFinish() { if (!selectedId) return; setError(null); setInfo(''); try { await finishSession(selectedId); setInfo('Sesi selesai'); load() } catch { setError('Gagal selesai') } }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Bookings</h2>
        <select className="h-9 rounded-md border border-[#e5e7eb] bg-white px-2 text-sm" value={status} onChange={e => setStatus((e.target as HTMLSelectElement).value)}>
          <option value="">Semua</option>
          <option value="PENDING_PAYMENT">Pending</option>
          <option value="PAID">Paid</option>
          <option value="AWAITING_CUSTOMER">Awaiting</option>
          <option value="EXPIRED">Expired</option>
          <option value="OVERRIDDEN">Overridden</option>
          <option value="ARRIVED">Arrived</option>
          <option value="ONGOING">Ongoing</option>
          <option value="DONE">Done</option>
        </select>
      </div>
      <Card className="p-4">
        <div className="grid lg:grid-cols-3 gap-3 items-end">
          <label className="grid gap-1"><span className="text-sm">Nama User</span><Input value={newUser} onChange={e => setNewUser((e.target as HTMLInputElement).value)} /></label>
          <label className="grid gap-1"><span className="text-sm">Outlet</span><Input value={newOutlet} onChange={e => setNewOutlet((e.target as HTMLInputElement).value)} /></label>
          <Button onClick={doCreate}>Buat Booking</Button>
        </div>
        <div className="flex gap-2 mt-3">
          <Button onClick={doConfirm} disabled={!selectedId}>Konfirmasi Pembayaran</Button>
          <Button onClick={doArrival} disabled={!selectedId}>Arrival</Button>
          <Button onClick={doStart} disabled={!selectedId}>Start</Button>
          <Button onClick={doFinish} disabled={!selectedId}>Finish</Button>
        </div>
        {info && <div className="text-[#22c55e] mt-2">{info}</div>}
        {error && <div className="text-[#ef4444] mt-2">{error}</div>}
      </Card>
      <Card className="p-4">
        {loading && <div>Memuat...</div>}
        {error && <div className="text-[#ef4444]">{error}</div>}
        <Table>
          <Thead><Tr><Th>ID</Th><Th>User</Th><Th>Outlet</Th><Th>Status</Th><Th>Waktu</Th></Tr></Thead>
          <Tbody>
            {items.map((b) => (
              <Tr key={b.id} className={selectedId===b.id? 'bg-[#f3f4f6]':''} onClick={() => setSelectedId(b.id)}><Td>{b.id}</Td><Td>{b.user_name}</Td><Td>{b.outlet_name}</Td><Td>{b.status}</Td><Td>{b.booking_time}</Td></Tr>
            ))}
          </Tbody>
        </Table>
      </Card>
    </div>
  )
}