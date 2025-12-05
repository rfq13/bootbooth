import { useEffect, useMemo, useState } from 'react'
import { Card } from '../components/ui/card'
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/table'
import { Button } from '../components/ui/button'
import { getActiveTerms, getTermsById, adminPublishTerms } from '../utils/api'
import { Info, BookText, UserCheck, CreditCard, Shield, HelpCircle, Check, ArrowRight, Phone, Mail } from 'lucide-react'

export default function TermsVersions(){
  const [versions, setVersions] = useState<any[]>([])
  const [active, setActive] = useState<any | null>(null)
  const [selected, setSelected] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const Icon = useMemo(() => ({
    info: Info, book: BookText, 'user-check': UserCheck, 'credit-card': CreditCard, shield: Shield, 'help-circle': HelpCircle, check: Check, 'arrow-right': ArrowRight, phone: Phone, mail: Mail,
  } as Record<string, any>), [])
  useEffect(()=>{
    setLoading(true)
    Promise.all([
      fetch((import.meta.env.VITE_API_BASE_URL||"") + '/terms').then(r=>r.json()).catch(()=>[]),
      getActiveTerms().catch(()=>null),
    ]).then(([list, act])=>{ setVersions(Array.isArray(list)? list: []); setActive(act || null) }).finally(()=> setLoading(false))
  },[])
  async function preview(id:number){ setErr(null); setMsg(null); try { const t = await getTermsById(id); setSelected(t) } catch(e:any){ setErr(e?.message||'Gagal memuat') } }
  async function publish(id:number){ setPublishing(true); setErr(null); setMsg(null); try { await adminPublishTerms(id); setMsg('Versi dipublish'); const act = await getActiveTerms(); setActive(act); } catch(e:any){ setErr(e?.message||'Gagal publish') } finally { setPublishing(false) } }
  function renderBlocks(content:any){ let blocks = content; if (typeof blocks === 'string') { try { blocks = JSON.parse(blocks) } catch { blocks = [] } } if (!Array.isArray(blocks)) blocks = []; return (
    <div className="prose prose-lg max-w-none">
      {blocks.map((b:any, i:number)=>{
        if (b.type === 'heading') { const Ico = (b.icon && Icon[b.icon]) ? Icon[b.icon] : Info; return (
          <div key={i} className="mb-6"><h2 className="text-2xl font-bold text-[#1a1917] flex items-center gap-3"><Ico className="text-[#B3916F]" />{b.text||''}</h2></div>
        )}
        if (b.type === 'paragraph') { return <p key={i} className="text-[#6d6354] leading-relaxed mb-3">{b.text||''}</p> }
        if (b.type === 'list') { const items = Array.isArray(b.items)? b.items: []; return (
          <div key={i} className="bg-[#FDF8F3] p-4 rounded-2xl mb-4"><ul className="space-y-2 text-[#6d6354] ml-4">{items.map((it:string,idx:number)=>(<li key={idx}>• {it}</li>))}</ul></div>
        )}
        if (b.type === 'callout') { const Ico = (b.icon && Icon[b.icon]) ? Icon[b.icon] : Info; return (
          <div key={i} className="bg-gradient-to-br from-[#FAF1E7] to-[#F3E5D3] p-6 rounded-2xl mb-4"><div className="flex items-start gap-3"><Ico className="text-[#B3916F]" /><div className="text-[#6d6354]">{b.text||''}</div></div></div>
        )}
        return null
      })}
    </div>
  ) }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-semibold">Versi Syarat & Ketentuan</h2></div>
      <Card className="p-4">
        {loading && <div>Memuat...</div>}
        {err && <div className="text-[#ef4444]">{err}</div>}
        <Table>
          <Thead><Tr><Th>ID</Th><Th>Versi</Th><Th>Status</Th><Th>Tanggal Berlaku</Th><Th>Published</Th><Th>Aksi</Th></Tr></Thead>
          <Tbody>
            {versions.map((v:any)=> (
              <Tr key={v.id}>
                <Td>{v.id}</Td>
                <Td>{v.version_code}</Td>
                <Td>{v.status}</Td>
                <Td>{v.effective_date ? new Date(v.effective_date).toLocaleString() : '-'}</Td>
                <Td>{v.published_at ? new Date(v.published_at).toLocaleString() : '-'}</Td>
                <Td className="flex gap-2">
                  <Button type="button" onClick={()=>preview(v.id)} className="bg-white text-[#1a1917] border-2 border-[#EAD0B3] hover:bg-[#FAF1E7]">Preview</Button>
                  <Button type="button" onClick={()=>publish(v.id)} disabled={publishing || v.status==='active'} className="bg-gradient-to-r from-[#C5A888] to-[#9B7A5B] text-white">{publishing? 'Mem-publish...' : 'Publish'}</Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
        {msg && <div className="text-[#16a34a] mt-2">{msg}</div>}
      </Card>
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-2">Versi Aktif</h3>
          {active ? renderBlocks(active.content) : <div className="text-[#6d6354]">Belum ada</div>}
        </Card>
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-2">Preview Versi Dipilih</h3>
          {selected ? renderBlocks(selected.content) : <div className="text-[#6d6354]">Pilih versi lalu klik Preview</div>}
        </Card>
      </div>
    </div>
  )
}
