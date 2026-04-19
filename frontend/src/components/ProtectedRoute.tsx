import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute() {
  const { user, ready } = useAuth()
  const location = useLocation()

  if (!ready) return null

  if (!user) {
    const returnTo = `${location.pathname}${location.search}`
    return (
      <Navigate
        to={{ pathname: '/auth', search: returnTo !== '/' ? `returnTo=${encodeURIComponent(returnTo)}` : '' }}
        replace
        state={{ from: location }}
      />
    )
  }

  return <Outlet />
}
