import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { loadSession, clearSession, loginUser, registerUser } from '../lib/auth'
import type { Session, AuthResult } from '../lib/auth'

interface AuthContextValue {
  session: Session | null
  login: (email: string, password: string) => AuthResult
  register: (name: string, email: string, password: string) => AuthResult
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(loadSession)

  const login = useCallback((email: string, password: string) => {
    const r = loginUser(email, password)
    if (r.ok && r.session) setSession(r.session)
    return r
  }, [])

  const register = useCallback((name: string, email: string, password: string) => {
    const r = registerUser(name, email, password)
    if (r.ok && r.session) setSession(r.session)
    return r
  }, [])

  const logout = useCallback(() => { clearSession(); setSession(null) }, [])

  return (
    <AuthContext.Provider value={{ session, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
