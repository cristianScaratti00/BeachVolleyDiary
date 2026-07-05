import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { loginUser, registerUser, logoutUser, sessionForUser } from '../lib/auth'
import type { Session, AuthResult } from '../lib/auth'

interface AuthContextValue {
  session: Session | null
  loading: boolean // true finché non si conosce lo stato iniziale della sessione
  login: (email: string, password: string) => Promise<AuthResult>
  register: (name: string, email: string, password: string) => Promise<AuthResult>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Sessione iniziale (ripristinata da localStorage da supabase-js)...
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(await sessionForUser(data.session?.user))
      setLoading(false)
    })
    // ...e sincronizzazione ad ogni cambiamento (login / logout / refresh token).
    // Il callback resta sincrono (profilo caricato via .then) per evitare il
    // deadlock noto quando si await-a supabase-js dentro onAuthStateChange.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      sessionForUser(s?.user).then((sess) => { setSession(sess); setLoading(false) })
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const login = useCallback((email: string, password: string) => loginUser(email, password), [])
  const register = useCallback(
    (name: string, email: string, password: string) => registerUser(name, email, password),
    [],
  )
  const logout = useCallback(() => logoutUser(), [])

  return (
    <AuthContext.Provider value={{ session, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
