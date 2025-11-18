import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LayoutDashboard, Box, Users, CalendarDays, ShieldAlert, Settings, HelpCircle } from 'lucide-react'

export function Sidebar() {
  const { role, isAuthenticated } = useAuth()
  if (!isAuthenticated.value) return null
  const isSuper = role.value === 'super_admin'
  return (
    <aside className="p-6" style={{ background: 'var(--panel)', color: 'var(--text)', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
      <h3 className="mb-4 font-bold">Backoffice</h3>
      <div className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--muted)' }}>General</div>
      <nav className="space-y-1">
        <NavLink className={({ isActive }) => (isActive ? 'flex items-center gap-2 px-3 py-2 rounded-md text-white' : 'flex items-center gap-2 px-3 py-2 rounded-md hover:opacity-90') } style={({ isActive }) => ({ background: isActive ? 'var(--accent-gradient)' : 'transparent', color: isActive ? '#111827' : 'var(--muted)' })} to="/dashboard"><LayoutDashboard size={16} className="icon-anim"/>Dashboard</NavLink>
        {isSuper && <NavLink className={({ isActive }) => (isActive ? 'flex items-center gap-2 px-3 py-2 rounded-md text-white' : 'flex items-center gap-2 px-3 py-2 rounded-md hover:opacity-90')} style={({ isActive }) => ({ background: isActive ? 'var(--accent-gradient)' : 'transparent', color: isActive ? '#111827' : 'var(--muted)' })} to="/outlets"><Box size={16} className="icon-anim"/>Outlets</NavLink>}
        {isSuper && <NavLink className={({ isActive }) => (isActive ? 'flex items-center gap-2 px-3 py-2 rounded-md text-white' : 'flex items-center gap-2 px-3 py-2 rounded-md hover:opacity-90')} style={({ isActive }) => ({ background: isActive ? 'var(--accent-gradient)' : 'transparent', color: isActive ? '#111827' : 'var(--muted)' })} to="/admins"><Users size={16} className="icon-anim"/>Admin Users</NavLink>}
        <NavLink className={({ isActive }) => (isActive ? 'flex items-center gap-2 px-3 py-2 rounded-md text-white' : 'flex items-center gap-2 px-3 py-2 rounded-md hover:opacity-90')} style={({ isActive }) => ({ background: isActive ? 'var(--accent-gradient)' : 'transparent', color: isActive ? '#111827' : 'var(--muted)' })} to="/bookings"><CalendarDays size={16} className="icon-anim"/>Bookings</NavLink>
        <NavLink className={({ isActive }) => (isActive ? 'flex items-center gap-2 px-3 py-2 rounded-md text-white' : 'flex items-center gap-2 px-3 py-2 rounded-md hover:opacity-90')} style={({ isActive }) => ({ background: isActive ? 'var(--accent-gradient)' : 'transparent', color: isActive ? '#111827' : 'var(--muted)' })} to="/override"><ShieldAlert size={16} className="icon-anim"/>Override</NavLink>
        {isSuper && <NavLink className={({ isActive }) => (isActive ? 'flex items-center gap-2 px-3 py-2 rounded-md text-white' : 'flex items-center gap-2 px-3 py-2 rounded-md hover:opacity-90')} style={({ isActive }) => ({ background: isActive ? 'var(--accent-gradient)' : 'transparent', color: isActive ? '#111827' : 'var(--muted)' })} to="/system-config"><Settings size={16} className="icon-anim"/>System Config</NavLink>}
      </nav>
      <div className="text-xs uppercase tracking-wide mt-4 mb-2" style={{ color: 'var(--muted)' }}>Account</div>
      <div className="space-y-1">
        <a className="block px-3 py-2 rounded-md hover:opacity-90" style={{ color: 'var(--muted)' }} href="#"><HelpCircle size={16} className="inline mr-2"/>Help</a>
      </div>
    </aside>
  )
}