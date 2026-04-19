import { createContext } from 'react'

export type AuthUser = {
  userId: number
  username: string
  email: string
  roles: string[]
}

export type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  /** True when the signed-in user has the Admin role (from login/register response). */
  isAdmin: boolean
  ready: boolean
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
