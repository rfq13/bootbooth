import { useEffect, useState } from 'react'
import { listOutlets } from '../utils/api'
import { Card } from '../components/ui/card'
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/table'

export default function Outlets() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setLoading(true)
    listOutlets().then(setItems).catch(() => setError('Gagal memuat')).finally(() => setLoading(false))
  }, [])
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-semibold">Outlets</h2></div>
      <Card className="p-4">
        {loading && <div>Memuat...</div>}
        {error && <div className="text-[#ef4444]">{error}</div>}
        <Table>
          <Thead><Tr><Th>Nama</Th><Th>Alamat</Th></Tr></Thead>
          <Tbody>
            {items.map((o) => (
              <Tr key={o.id}><Td>{o.name}</Td><Td>{o.address}</Td></Tr>
            ))}
          </Tbody>
        </Table>
      </Card>
    </div>
  )
}