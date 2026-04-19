import { useState, type FormEvent } from 'react'
import { changePassword } from '../../api/auth'
import { isRealSnippetApiEnabled } from '../../api/snippets'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../context/ToastProvider'
import { PasswordField } from '../../components/PasswordField'

export default function SettingsPage() {
  const { user, token } = useAuth()
  const { showToast } = useToast()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError('You need to be signed in.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }

    setPending(true)
    try {
      await changePassword({ currentPassword, newPassword }, token)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      showToast('Password updated successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change password.')
    } finally {
      setPending(false)
    }
  }

  const canUseApi = isRealSnippetApiEnabled() && !!token

  return (
    <section className="profile-panel" aria-labelledby="profile-settings-heading">
      <h2 id="profile-settings-heading" className="profile-panel__heading">
        Settings
      </h2>
      <p className="profile-panel__lede">Account and security preferences.</p>

      <div className="settings-block">
        <h3 className="settings-block__title">Password</h3>
        {!canUseApi && (
          <p className="settings-block__text">
            Password changes require the live API. Remove <code className="profile-panel__code">VITE_USE_MOCK_FEED</code>{' '}
            from your environment and run the backend to update your password here.
          </p>
        )}
        {canUseApi && (
          <>
            <p className="settings-block__text">
              Use at least 8 characters with upper, lower, and a number (same rules as registration).
            </p>
            <form className="settings-password-form" onSubmit={(e) => void handleChangePassword(e)} noValidate>
              <PasswordField
                label="Current password"
                name="currentPassword"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={pending}
              />
              <PasswordField
                label="New password"
                name="newPassword"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                disabled={pending}
              />
              <PasswordField
                label="Confirm new password"
                name="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                disabled={pending}
              />
              {error && (
                <div className="settings-password-form__error" role="alert">
                  {error}
                </div>
              )}
              <button type="submit" className="btn btn--primary settings-password-form__submit" disabled={pending}>
                {pending ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </>
        )}
      </div>

      {user && (
        <p className="profile-panel__muted settings-account-hint">
          Signed in as <strong>{user.email}</strong> (@{user.username}).
        </p>
      )}
    </section>
  )
}
