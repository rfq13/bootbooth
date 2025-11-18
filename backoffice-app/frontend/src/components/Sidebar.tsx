import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LayoutDashboard, Box, Users, CalendarDays, ShieldAlert, Settings, HelpCircle } from 'lucide-react'

export function Sidebar() {
  const { role, isAuthenticated } = useAuth()
  if (!isAuthenticated.value) return null
  const isSuper = role.value === 'super_admin'
  return (
    <aside className="bg-[#0d0f14] text-[#e5e7eb] border-r border-white/10 p-6">
      <h3 className="mb-4 font-bold">Backoffice</h3>
      <div className="text-xs uppercase tracking-wide text-[#6b7280] mb-2">General</div>
      <nav className="space-y-1">
        <NavLink className={({ isActive }) => (isActive ? 'flex items-center gap-2 px-3 py-2 rounded-md bg-[#171a21] text-white' : 'flex items-center gap-2 px-3 py-2 rounded-md text-[#cbd5e1] hover:bg-[#171a21]') } to="/dashboard"><LayoutDashboard size={16}/>Dashboard</NavLink>
        {isSuper && <NavLink className={({ isActive }) => (isActive ? 'flex items-center gap-2 px-3 py-2 rounded-md bg-[#171a21] text-white' : 'flex items-center gap-2 px-3 py-2 rounded-md text-[#cbd5e1] hover:bg-[#171a21]')} to="/outlets"><Box size={16}/>Outlets</NavLink>}
        {isSuper && <NavLink className={({ isActive }) => (isActive ? 'flex items-center gap-2 px-3 py-2 rounded-md bg-[#171a21] text-white' : 'flex items-center gap-2 px-3 py-2 rounded-md text-[#cbd5e1] hover:bg-[#171a21]')} to="/admins"><Users size={16}/>Admin Users</NavLink>}
        <NavLink className={({ isActive }) => (isActive ? 'flex items-center gap-2 px-3 py-2 rounded-md bg-[#171a21] text-white' : 'flex items-center gap-2 px-3 py-2 rounded-md text-[#cbd5e1] hover:bg-[#171a21]')} to="/bookings"><CalendarDays size={16}/>Bookings</NavLink>
        <NavLink className={({ isActive }) => (isActive ? 'flex items-center gap-2 px-3 py-2 rounded-md bg-[#171a21] text-white' : 'flex items-center gap-2 px-3 py-2 rounded-md text-[#cbd5e1] hover:bg-[#171a21]')} to="/override"><ShieldAlert size={16}/>Override</NavLink>
        {isSuper && <NavLink className={({ isActive }) => (isActive ? 'flex items-center gap-2 px-3 py-2 rounded-md bg-[#171a21] text-white' : 'flex items-center gap-2 px-3 py-2 rounded-md text-[#cbd5e1] hover:bg-[#171a21]')} to="/system-config"><Settings size={16}/>System Config</NavLink>}
      </nav>
      <div className="text-xs uppercase tracking-wide text-[#6b7280] mt-4 mb-2">Account</div>
      <div className="space-y-1">
        <a className="block px-3 py-2 rounded-md text-[#cbd5e1] hover:bg-[#171a21]" href="#"><HelpCircle size={16} className="inline mr-2"/>Help</a>
      </div>
    </aside>
  )
}