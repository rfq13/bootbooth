import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import type { ReactElement } from 'react'
import { Suspense, lazy } from 'react'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { useAuth } from '../hooks/useAuth'
import '../styles/global.css'
import ProtectedRoute from '../components/ProtectedRoute'
import PublicLayout from '../layouts/PublicLayout'
import AuthLayout from '../layouts/AuthLayout'
import AdminLayout from '../layouts/AdminLayout'

const Dashboard = lazy(() => import('../routes/Dashboard'))
const Outlets = lazy(() => import('../routes/Outlets'))
const AdminUsers = lazy(() => import('../routes/AdminUsers'))
const Bookings = lazy(() => import('../routes/Bookings'))
const Override = lazy(() => import('../routes/Override'))
const Login = lazy(() => import('../routes/Login'))
const SystemConfig = lazy(() => import('../routes/SystemConfig'))
const Landing = lazy(() => import('../routes/Landing'))

function Protected({ children, roles }: { children: any; roles?: Array<'admin'|'super_admin'> }) {
  const { isAuthenticated, role } = useAuth()
  if (!isAuthenticated.value) return <Navigate to="/" replace />
  if (roles && role.value && !roles.includes(role.value)) return <Navigate to="/dashboard" replace />
  return children
}

function InnerApp() {
  useAuth() // ensure signals ready
  return (
    <ErrorBoundary>
      <Suspense fallback={<div>Memuat...</div>}>
        <Routes>
          <Route element={<PublicLayout /> as unknown as ReactElement}>
            <Route path="/" element={<Landing /> as unknown as ReactElement} />
          </Route>
          <Route element={<AuthLayout /> as unknown as ReactElement}>
            <Route path="/login" element={<Login /> as unknown as ReactElement} />
          </Route>
          <Route element={<ProtectedRoute>{<AdminLayout />}</ProtectedRoute> as unknown as ReactElement}>
            <Route path="/dashboard" element={<Dashboard /> as unknown as ReactElement} />
            <Route path="/outlets" element={<Outlets /> as unknown as ReactElement} />
            <Route path="/admins" element={<AdminUsers /> as unknown as ReactElement} />
            <Route path="/bookings" element={<Bookings /> as unknown as ReactElement} />
            <Route path="/override" element={<Override /> as unknown as ReactElement} />
            <Route path="/system-config" element={<SystemConfig /> as unknown as ReactElement} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <InnerApp />
    </BrowserRouter>
  )
}

export { App as default }