import { NavLink, Outlet } from 'react-router-dom'

function tabClassName(isActive: boolean) {
  return ['profile-tab', isActive ? 'profile-tab--active' : ''].filter(Boolean).join(' ')
}

export default function ProfileLayout() {
  return (
    <div className="profile-layout">
      <header className="profile-layout__header">
        <div className="profile-layout__identity">
          <div className="profile-layout__avatar" aria-hidden="true">
            U
          </div>
          <div className="profile-layout__titles">
            <h1 className="profile-layout__title">Your profile</h1>
            <p className="profile-layout__handle">@you</p>
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
