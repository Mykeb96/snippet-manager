import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import AdminPage from '../pages/admin/AdminPage'

export default function AdminRoute() {
  const { user } = useAuth()
  if (!user?.roles.includes('Admin')) {
    return <Navigate to="/" replace />
  }
  return <AdminPage />
}
