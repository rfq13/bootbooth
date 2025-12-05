import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute({ children, roles }: { children: any; roles?: Array<'admin'|'super_admin'|'user'> }) {
  const { isAuthenticated, role } = useAuth()
  if (!isAuthenticated.value) return <Navigate to="/login" replace />
  if (roles && role.value && !roles.includes(role.value)) return <Navigate to="/dashboard" replace />
  return children
}

export default ProtectedRoute
