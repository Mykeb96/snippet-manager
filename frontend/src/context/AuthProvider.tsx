import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { login as apiLogin, register as apiRegister, type AuthResponseDto } from '../api/auth'
import { AuthContext } from './authContext'
import type { AuthUser } from './authContext'
import { parseRolesFromAccessToken } from '../utils/parseJwtRoles'

const STORAGE_KEY = 'snippet-manager.auth'

type StoredAuth = {
  userId: number
  username: string
  email: string
  accessToken: string
  expiresAtUtc: string
}

function readStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as StoredAuth
    if (!data.accessToken || !data.expiresAtUtc) return null
    if (Number.isNaN(Date.parse(data.expiresAtUtc)) || Date.parse(data.expiresAtUtc) <= Date.now()) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return data
  } catch {
    return null
  }
}

function persistAuth(data: AuthResponseDto): StoredAuth {
  const stored: StoredAuth = {
    userId: data.userId,
    username: data.username,
    email: data.email,
    accessToken: data.accessToken,
    expiresAtUtc:
      typeof data.expiresAtUtc === 'string' ? data.expiresAtUtc : new Date(data.expiresAtUtc).toISOString(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  return stored
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<StoredAuth | null>(() => readStoredAuth())
  const [ready] = useState(true)

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setStored(null)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiLogin({ email, password })
    setStored(persistAuth(res))
  }, [])

  const register = useCallback(async (username: string, email: string, password: string) => {
    const res = await apiRegister({ username, email, password })
    setStored(persistAuth(res))
  }, [])

  const value = useMemo(() => {
    const token = stored?.accessToken ?? null
    const roles = token ? parseRolesFromAccessToken(token) : []
    const user: AuthUser | null = stored
      ? {
          userId: stored.userId,
          username: stored.username,
          email: stored.email,
          roles,
        }
      : null
    const isAdmin = roles.includes('Admin')
    return {
      user,
      token,
      isAdmin,
      ready,
      login,
      register,
      logout,
    }
  }, [stored, ready, login, register, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
