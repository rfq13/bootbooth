import { StaticRouter } from 'react-router-dom/server'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { Sidebar } from '../components/Sidebar'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { useAuth } from '../hooks/useAuth'
import '../styles/global.css'

const Dashboard = lazy(() => import('../routes/Dashboard'))
const Outlets = lazy(() => import('../routes/Outlets'))
const AdminUsers = lazy(() => import('../routes/AdminUsers'))
const Bookings = lazy(() => import('../routes/Bookings'))
const Override = lazy(() => import('../routes/Override'))
const Login = lazy(() => import('../routes/Login'))
const SystemConfig = lazy(() => import('../routes/SystemConfig'))

function Protected({ children, roles }: { children: any; roles?: Array<'admin'|'super_admin'|'user'> }) {
  const { isAuthenticated, role } = useAuth()
  if (!isAuthenticated.value) return <Navigate to="/" replace />
  if (roles && role.value && !roles.includes(role.value)) return <Navigate to="/dashboard" replace />
  return children
}

export function App({ url }: { url: string }) {
  const { isAuthenticated } = useAuth()
  const children = (
      <div className={"layout" + (!isAuthenticated.value ? " no-sidebar" : "")}>
        {isAuthenticated.value && <Sidebar />}
        <div className={"content" + (!isAuthenticated.value ? " center" : "") }>
          <ErrorBoundary>
            <Suspense fallback={<div>Memuat...</div>}>
              <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/outlets" element={<Protected roles={["super_admin"]}><Outlets /></Protected>} />
                <Route path="/admins" element={<Protected roles={["super_admin"]}><AdminUsers /></Protected>} />
                <Route path="/bookings" element={<Protected roles={["admin","super_admin"]}><Bookings /></Protected>} />
                <Route path="/override" element={<Protected roles={["admin","super_admin"]}><Override /></Protected>} />
                <Route path="/system-config" element={<Protected roles={["super_admin"]}><SystemConfig /></Protected>} />
              </Routes>
              {isAuthenticated.value && (
                <div className="topbar">
                  <span className="badge">{`Role: ${useAuth().role.value || '-'}`}</span>
                </div>
              )}
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
  ) as any
  return (
    <StaticRouter location={url}>{children}</StaticRouter>
  )
}

export { App as default }
