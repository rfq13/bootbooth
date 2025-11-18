import { Input } from './ui/input'
import { Button } from './ui/button'
import { useAuth } from '../hooks/useAuth'
import { User } from 'lucide-react'

export function Topbar() {
  const { role, logout } = useAuth()
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex-1 max-w-md">
        <Input placeholder="Search" />
      </div>
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-2 text-sm text-[#6b7280]"><User size={16} />{role.value || '-'}</span>
        <Button onClick={() => logout()}>Keluar</Button>
      </div>
    </div>
  )
}