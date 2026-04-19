import { createContext } from 'react'

export type AuthUser = {
  userId: number
  username: string
  email: string
}

export type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  ready: boolean
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
