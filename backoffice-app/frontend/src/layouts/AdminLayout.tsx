import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { Topbar } from '../components/Topbar'
import { useAuth } from '../hooks/useAuth'

export default function AdminLayout() {
  const { isAuthenticated } = useAuth()
  return (
    <div className={isAuthenticated.value ? 'grid grid-cols-[260px_1fr] h-full' : 'grid grid-cols-1 h-full'}>
      {isAuthenticated.value && <Sidebar />}
      <div className={isAuthenticated.value ? 'p-6' : 'p-6'}>
        {isAuthenticated.value && <Topbar />}
        <Outlet />
      </div>
    </div>
  )
}