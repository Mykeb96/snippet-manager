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
  /** True when the JWT includes the Admin role (derived from the access token, not editable storage fields). */
  isAdmin: boolean
  /** True when the JWT includes the Owner role (only Owners can grant Admin to others). */
  isOwner: boolean
  ready: boolean
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
