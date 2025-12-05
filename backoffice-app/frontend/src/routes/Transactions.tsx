import { useEffect, useMemo, useState } from 'react'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import ProtectedRoute from '../components/ProtectedRoute'
import { listTransactions, createTransaction, validateTransaction, payTransaction } from '../utils/api'

export default function Transactions() {
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('IDR')
  const [description, setDescription] = useState('')
  const [items, setItems] = useState<{name:string;quantity:number;price:number}[]>([{name:'Produk A',quantity:1,price:10000}])
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const amountValid = useMemo(() => /^\d+(?:\.\d{1,2})?$/.test(amount) && Number(amount) > 0, [amount])
  const descValid = useMemo(() => description.trim().length >= 3, [description])
  const itemsValid = useMemo(() => items.length > 0 && items.every(i => i.name.trim() && i.quantity > 0 && i.price >= 0), [items])
  const [history, setHistory] = useState<any[]>([])
  async function refresh() { try { const res = await listTransactions(); setHistory(res) } catch {} }
  useEffect(() => { refresh() }, [])
  function setItem(idx:number, key:'name'|'quantity'|'price', value:any){ setItems(prev => prev.map((it,i)=> i===idx? {...it,[key]: key==='name'? String(value): Number(value)}: it)) }
  function addItem(){ setItems(prev => [...prev, {name:'Produk Baru',quantity:1,price:0}]) }
  async function onSubmit(e: React.FormEvent){
    e.preventDefault()
    setError(null); setMsg(null)
    if (!amountValid) { setError('Nominal tidak valid'); return }
    if (!descValid) { setError('Deskripsi minimal 3 karakter'); return }
    if (!itemsValid) { setError('Item transaksi tidak valid'); return }
    setLoading(true)
    try {
      const payload = { amount: Number(amount), currency, description, items }
      const created = await createTransaction(payload)
      await validateTransaction(created.id)
      const pay = await payTransaction(created.id)
      setMsg('Transaksi dibuat. Lanjutkan ke pembayaran.');
      window.open(pay.payment_url, '_blank')
      refresh()
      setAmount(''); setDescription(''); setItems([{name:'Produk A',quantity:1,price:10000}])
    } catch (err: any) {
      setError(err?.message || 'Gagal memproses transaksi')
    } finally { setLoading(false) }
  }
  return (
    <ProtectedRoute roles={['user']}>
      <div className="space-y-6">
        <Card className="p-6 shadow-[0_20px_40px_rgba(155,122,91,0.15)] bg-white">
          <h3 className="text-xl font-semibold mb-4 text-[#1a1917]">Buat Transaksi</h3>
          <form onSubmit={onSubmit as any} className="grid gap-4">
            <label className="grid gap-1">
              <span className="text-sm text-[#6d6354]">Nominal</span>
              <Input placeholder="Masukkan nominal transaksi (contoh: 150000)" value={amount} onChange={e=>setAmount((e.target as HTMLInputElement).value)} className="bg-[#FAF1E7] border-[#EAD0B3] focus:border-[#D6BFA1]" />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-[#6d6354]">Mata Uang</span>
              <Input placeholder="Contoh: IDR" value={currency} onChange={e=>setCurrency((e.target as HTMLInputElement).value)} className="bg-[#FAF1E7] border-[#EAD0B3] focus:border-[#D6BFA1]" />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-[#6d6354]">Deskripsi</span>
              <Input placeholder="Jelaskan transaksi Anda (min. 3 karakter)" value={description} onChange={e=>setDescription((e.target as HTMLInputElement).value)} className="bg-[#FAF1E7] border-[#EAD0B3] focus:border-[#D6BFA1]" />
            </label>
            <div className="grid gap-2">
              <span className="text-sm text-[#6d6354]">Item</span>
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-2">
                  <Input placeholder="Nama item" value={it.name} onChange={e=>setItem(idx,'name',(e.target as HTMLInputElement).value)} className="bg-[#FAF1E7] border-[#EAD0B3]" />
                  <Input placeholder="Jumlah" value={String(it.quantity)} onChange={e=>setItem(idx,'quantity',(e.target as HTMLInputElement).value)} className="bg-[#FAF1E7] border-[#EAD0B3]" />
                  <Input placeholder="Harga per item" value={String(it.price)} onChange={e=>setItem(idx,'price',(e.target as HTMLInputElement).value)} className="bg-[#FAF1E7] border-[#EAD0B3]" />
                </div>
              ))}
              <Button type="button" onClick={addItem} className="bg-white text-[#1a1917] border-2 border-[#EAD0B3] hover:bg-[#FAF1E7]">Tambah Item</Button>
            </div>
            {error && <span className="text-[#ef4444] text-sm" role="alert">{error}</span>}
            {msg && <span className="text-[#16a34a] text-sm" role="status">{msg}</span>}
            <Button aria-busy={loading} disabled={loading} className="bg-gradient-to-r from-[#C5A888] to-[#9B7A5B] text-white">{loading ? 'Memuat...' : 'Proses Pembayaran'}</Button>
          </form>
        </Card>
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4 text-[#1a1917]">Riwayat Transaksi</h3>
          <div className="grid gap-2">
            {history.map((t:any) => (
              <div key={t.id} className="p-3 border rounded">
                <div className="font-medium">#{t.id} • {t.status}</div>
                <div>{t.currency} {t.amount}</div>
                <div className="text-sm text-[#6d6354]">{t.description}</div>
              </div>
            ))}
            {history.length === 0 && <div className="text-[#6d6354]">Belum ada transaksi</div>}
          </div>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
