import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

type Mode = 'login' | 'register'

export default function AuthPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo') || '/'

  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      if (mode === 'register' && !username.trim()) {
        setError('Username is required.')
        return
      }
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(username.trim(), email, password)
      }
      const safe =
        returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/'
      navigate(safe, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setPending(false)
    }
  }

  const title = mode === 'login' ? 'Sign in' : 'Create account'

  return (
    <div className="auth-page">
      <div className="auth-card">
        <header className="auth-card__header">
          <h1 className="auth-card__title">{title}</h1>
          <p className="auth-card__subtitle">
            {mode === 'login' ? (
              <>
                New here?{' '}
                <button
                  type="button"
                  className="auth-card__switch"
                  onClick={() => {
                    setMode('register')
                    setError(null)
                  }}
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  className="auth-card__switch"
                  onClick={() => {
                    setMode('login')
                    setError(null)
                  }}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {mode === 'register' && (
            <label className="auth-field">
              <span className="auth-field__label">Username</span>
              <input
                className="auth-field__input"
                type="text"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                maxLength={64}
              />
            </label>
          )}
          <label className="auth-field">
            <span className="auth-field__label">Email</span>
            <input
              className="auth-field__input"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="auth-field">
            <span className="auth-field__label">Password</span>
            <input
              className="auth-field__input"
              type="password"
              name="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            {mode === 'register' && (
              <span className="auth-field__hint">
                At least 8 characters with upper, lower, and a number.
              </span>
            )}
          </label>

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <button type="submit" className="btn btn--primary auth-submit" disabled={pending}>
            {pending ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Register'}
          </button>
        </form>

        <p className="auth-footer">
          <Link to="/" className="auth-footer__link">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  )
}
