import { useMemo, useState } from 'react'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { adminCreateTerms, adminPublishTerms } from '../utils/api'
import { role as authRole } from '../hooks/useAuth'
import { Info, BookText, UserCheck, CreditCard, Shield, HelpCircle, Check, ArrowRight, Phone, Mail } from 'lucide-react'

type Block = { type: 'heading'|'paragraph'|'list'|'callout'; text?: string; items?: string[]; icon?: string; level?: number }

export default function TermsEditor(){
  const [blocks, setBlocks] = useState<Block[]>([])
  const [effective, setEffective] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const icons = useMemo(()=>[
    {key:'info', label:'Info', I:Info},
    {key:'book', label:'Book', I:BookText},
    {key:'user-check', label:'User Check', I:UserCheck},
    {key:'credit-card', label:'Credit Card', I:CreditCard},
    {key:'shield', label:'Shield', I:Shield},
    {key:'help-circle', label:'Help', I:HelpCircle},
    {key:'check', label:'Check', I:Check},
    {key:'arrow-right', label:'Arrow Right', I:ArrowRight},
    {key:'phone', label:'Phone', I:Phone},
    {key:'mail', label:'Mail', I:Mail},
  ],[])
  function addBlock(t: Block['type']){ setBlocks(prev=>[...prev,{ type:t, text:'', items: t==='list'? ['Point A','Point B']: undefined, icon:'info', level:2 }]) }
  function setBlock(i:number, b:Partial<Block>){ setBlocks(prev=> prev.map((x,idx)=> idx===i? { ...x, ...b }: x)) }
  async function save(){ setSaving(true); setMsg(null); setErr(null); try { const res = await adminCreateTerms({ content: blocks, effective_date: effective || undefined, version_notes: notes || undefined }); setMsg(`Draft tersimpan ${res.version_code}`); } catch(e:any){ setErr(e?.message || 'Gagal menyimpan') } finally { setSaving(false) } }
  async function publish(){ setPublishing(true); setMsg(null); setErr(null); try { const res = await adminCreateTerms({ content: blocks, effective_date: effective || undefined, version_notes: notes || undefined }); await adminPublishTerms(res.id); setMsg(`Versi ${res.version_code} dipublish`); } catch(e:any){ setErr(e?.message || 'Gagal publish') } finally { setPublishing(false) } }
  const canPublish = authRole.value === 'super_admin'
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-semibold">Editor Syarat & Ketentuan</h2></div>
      <Card className="p-4">
        <div className="grid md:grid-cols-2 gap-3">
          <label className="grid gap-1"><span className="text-sm text-[#6d6354]">Tanggal berlaku (ISO)</span><Input value={effective} onChange={e=>setEffective((e.target as HTMLInputElement).value)} placeholder="Contoh: 2025-01-01T00:00:00Z" className="bg-[#FAF1E7] border-[#EAD0B3]"/></label>
          <label className="grid gap-1"><span className="text-sm text-[#6d6354]">Catatan versi</span><Input value={notes} onChange={e=>setNotes((e.target as HTMLInputElement).value)} placeholder="Ringkasan perubahan" className="bg-[#FAF1E7] border-[#EAD0B3]"/></label>
        </div>
        <div className="flex gap-2 mt-3">
          <Button disabled={saving} onClick={save} className="bg-gradient-to-r from-[#C5A888] to-[#9B7A5B] text-white">{saving? 'Menyimpan...' : 'Simpan Draft'}</Button>
          {canPublish && <Button disabled={publishing} onClick={publish} className="bg-[#1a1917] text-white">{publishing? 'Mem-publish...' : 'Publish'}</Button>}
          {err && <span className="text-[#ef4444] text-sm" role="alert">{err}</span>}
          {msg && <span className="text-[#16a34a] text-sm" role="status">{msg}</span>}
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex gap-2 mb-3">
          <Button type="button" onClick={()=>addBlock('heading')}>Tambah Heading</Button>
          <Button type="button" onClick={()=>addBlock('paragraph')}>Tambah Paragraf</Button>
          <Button type="button" onClick={()=>addBlock('list')}>Tambah List</Button>
          <Button type="button" onClick={()=>addBlock('callout')}>Tambah Callout</Button>
        </div>
        <div className="grid gap-4">
          {blocks.map((b, i)=> (
            <div key={i} className="bg-[#FDF8F3] p-4 rounded-2xl">
              <div className="flex items-center justify-between mb-2"><span className="text-sm text-[#6d6354]">{b.type}</span></div>
              {(b.type==='heading' || b.type==='callout') && (
                <div className="grid md:grid-cols-3 gap-2">
                  <Input value={b.text || ''} onChange={e=>setBlock(i,{ text:(e.target as HTMLInputElement).value })} placeholder="Judul/isi" className="bg-white"/>
                  <select value={b.icon || 'info'} onChange={e=>setBlock(i,{ icon: e.target.value })} className="bg-white rounded px-3 py-2 border">
                    {icons.map(ic=> <option key={ic.key} value={ic.key}>{ic.label}</option>)}
                  </select>
                  <select value={String(b.level || 2)} onChange={e=>setBlock(i,{ level: Number(e.target.value) })} className="bg-white rounded px-3 py-2 border">
                    {[2,3,4].map(n=> <option key={n} value={n}>H{n}</option>)}
                  </select>
                </div>
              )}
              {b.type==='paragraph' && (
                <Input value={b.text || ''} onChange={e=>setBlock(i,{ text:(e.target as HTMLInputElement).value })} placeholder="Paragraf" className="bg-white"/>
              )}
              {b.type==='list' && (
                <div className="grid gap-2">
                  {(b.items||[]).map((it,idx)=> (
                    <Input key={idx} value={it} onChange={e=>{
                      const v = String((e.target as HTMLInputElement).value); const items = [...(b.items||[])]; items[idx]=v; setBlock(i,{ items })
                    }} placeholder={`Item ${idx+1}`} className="bg-white"/>
                  ))}
                  <Button type="button" onClick={()=> setBlock(i,{ items:[...((b.items||[])), 'Item baru'] })} className="bg-white text-[#1a1917] border">Tambah Item</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
