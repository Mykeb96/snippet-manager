import { Link, NavLink, Outlet } from 'react-router-dom'

function navClassName(isActive: boolean) {
  return ['nav-link', isActive ? 'nav-link--active' : ''].filter(Boolean).join(' ')
}

function avatarClassName(isActive: boolean) {
  return ['avatar-btn', isActive ? 'avatar-btn--active' : ''].filter(Boolean).join(' ')
}

export default function AppLayout() {
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
            <a className="nav-link" href="/faq">
              FAQ
            </a>
            <a className="nav-link" href="/contact">
              Contact
            </a>
          </nav>

          <NavLink
            to="/profile"
            className={({ isActive }) => avatarClassName(isActive)}
            aria-label="Profile"
          >
            <span className="avatar-fallback" aria-hidden="true">
              U
            </span>
          </NavLink>
        </div>
      </header>

      <main id="main" className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
