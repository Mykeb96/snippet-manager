import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

function tabClassName(isActive: boolean) {
  return ['profile-tab', isActive ? 'profile-tab--active' : ''].filter(Boolean).join(' ')
}

export default function ProfileLayout() {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  const initial = user.username.trim().slice(0, 1).toUpperCase() || '?'

  return (
    <div className="profile-layout">
      <header className="profile-layout__header">
        <div className="profile-layout__identity" aria-label={`Profile: ${user.username}`}>
          <div className="profile-layout__avatar" aria-hidden="true">
            {initial}
          </div>
          <div className="profile-layout__titles">
            <h1 className="profile-layout__title">{user.username}</h1>
            <p className="profile-layout__handle">@{user.username}</p>
            <p className="profile-layout__email">{user.email}</p>
          </div>
        </div>

        <nav className="profile-tabs" aria-label="Profile sections">
          <NavLink to="my-snippets" className={({ isActive }) => tabClassName(isActive)} end>
            My snippets
          </NavLink>
          <NavLink to="favorites" className={({ isActive }) => tabClassName(isActive)}>
            Favorites
          </NavLink>
          <NavLink to="settings" className={({ isActive }) => tabClassName(isActive)}>
            Settings
          </NavLink>
        </nav>
      </header>

      <div className="profile-layout__body">
        <Outlet />
      </div>
    </div>
  )
}
