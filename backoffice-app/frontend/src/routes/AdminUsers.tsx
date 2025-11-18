import { useEffect, useState } from 'react'
import { listAdminUsers } from '../utils/api'
import { Card } from '../components/ui/card'
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/table'

export default function AdminUsers() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setLoading(true)
    listAdminUsers().then(setItems).catch(() => setError('Gagal memuat')).finally(() => setLoading(false))
  }, [])
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-semibold">Admin Users</h2></div>
      <Card className="p-4">
        {loading && <div>Memuat...</div>}
        {error && <div className="text-[#ef4444]">{error}</div>}
        <Table>
          <Thead><Tr><Th>Nama</Th><Th>Email</Th><Th>Outlet</Th></Tr></Thead>
          <Tbody>
            {items.map((u) => (
              <Tr key={u.id}><Td>{u.name}</Td><Td>{u.email}</Td><Td>{u.outlet_name}</Td></Tr>
            ))}
          </Tbody>
        </Table>
      </Card>
    </div>
  )
}