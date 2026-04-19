import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function navClassName(isActive: boolean) {
  return ['nav-link', isActive ? 'nav-link--active' : ''].filter(Boolean).join(' ')
}

function avatarClassName(isActive: boolean) {
  return ['avatar-btn', isActive ? 'avatar-btn--active' : ''].filter(Boolean).join(' ')
}

export default function AppLayout() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  function handleSignOut() {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="app">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <header className="app-header">
        <div className="app-header__inner">
          <Link className="app-brand-link" to="/" aria-label="Snippet manager home">
            <img className="app-logo-img" src="/logo.svg" width={40} height={40} alt="" />
            <div className="app-brand">
              <h1 className="app-logo">Snippet manager</h1>
              <p className="app-tagline">Organize your code</p>
            </div>
          </Link>

          <nav className="app-nav" aria-label="Main">
            <NavLink to="/" end className={({ isActive }) => navClassName(isActive)}>
              Home
            </NavLink>
            <NavLink to="/faq" className={({ isActive }) => navClassName(isActive)}>
              FAQ
            </NavLink>
            <NavLink to="/contact" className={({ isActive }) => navClassName(isActive)}>
              Contact
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" className={({ isActive }) => navClassName(isActive)}>
                Admin
              </NavLink>
            )}
          </nav>

          {user ? (
            <div className="app-header__session">
              <NavLink
                to="/profile"
                className={({ isActive }) => avatarClassName(isActive)}
                aria-label="Profile"
              >
                <span className="avatar-fallback" aria-hidden="true">
                  {user.username.slice(0, 1).toUpperCase()}
                </span>
              </NavLink>
              <button type="button" className="header-signout" onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          ) : (
            <Link className="header-signin" to="/auth">
              Sign in
            </Link>
          )}
        </div>
      </header>

      <main id="main" className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
