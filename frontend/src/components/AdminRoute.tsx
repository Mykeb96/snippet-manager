import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import AdminPage from '../pages/admin/AdminPage'

export default function AdminRoute() {
  const { user } = useAuth()
  if (!user?.roles.some((r) => r === 'Admin' || r === 'Owner')) {
    return <Navigate to="/" replace />
  }
  return <AdminPage />
}
