import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import HomePage from './pages/HomePage'
import FaqPage from './pages/FaqPage'
import ProfileLayout from './pages/profile/ProfileLayout'
import MySnippetsPage from './pages/profile/MySnippetsPage'
import FavoritesPage from './pages/profile/FavoritesPage'
import SettingsPage from './pages/profile/SettingsPage'
import './App.css'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="faq" element={<FaqPage />} />
        <Route path="profile" element={<ProfileLayout />}>
          <Route index element={<Navigate to="my-snippets" replace />} />
          <Route path="my-snippets" element={<MySnippetsPage />} />
          <Route path="favorites" element={<FavoritesPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
