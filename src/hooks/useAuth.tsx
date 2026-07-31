import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import Clarity from '@microsoft/clarity'
import { supabase } from '../lib/supabase'
import { loginUser, registerUser, logoutUser, sessionForUser, signInWithProvider } from '../lib/auth'
import type { Session, AuthResult, OAuthProvider } from '../lib/auth'

interface AuthContextValue {
  session: Session | null
  loading: boolean // true finché non si conosce lo stato iniziale della sessione
  login: (email: string, password: string) => Promise<AuthResult>
  register: (name: string, email: string, password: string) => Promise<AuthResult>
  loginWithProvider: (provider: OAuthProvider) => Promise<AuthResult>
  logout: () => Promise<void>
  refresh: () => Promise<void> // rilegge il profilo (es. dopo cambio avatar/piano)
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

  // Lega le sessioni registrate da Clarity all'utente. Clarity fa l'hash
  // dell'id sul client prima di spedirlo, e comunque un uuid da solo non dice
  // niente a Microsoft: per risalire alla persona serve il TUO database.
  //
  // Passiamo solo l'id. `identify` accetterebbe anche un `friendlyName`, ma
  // sarebbe nome o email in chiaro verso un terzo — l'uuid basta a incrociare
  // le registrazioni con i tuoi dati, e costa molto meno in esposizione.
  //
  // Il guard su PROD non è pignoleria: `Clarity.identify` chiama
  // `window.clarity(...)` senza try/catch (a differenza di `init`), e in
  // sviluppo, dove Clarity non è inizializzato, quella funzione non esiste.
  useEffect(() => {
    if (!import.meta.env.PROD || !session?.id) return
    Clarity.identify(session.id)
  }, [session?.id])

  // Riallinea piano/ruolo rileggendo il profilo (senza rete sulla sessione: usa
  // quella locale). Serve perché un cambio piano lato admin non emette eventi
  // auth: senza questo, un utente declassato resterebbe "Premium" in memoria
  // finché non ricarica la pagina.
  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    if (!data.session?.user) return // non loggato: non toccare lo stato
    setSession(await sessionForUser(data.session.user))
  }, [])

  // Ricontrolla quando la tab torna attiva (o riprende il focus).
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  const login = useCallback((email: string, password: string) => loginUser(email, password), [])
  const register = useCallback(
    (name: string, email: string, password: string) => registerUser(name, email, password),
    [],
  )
  const loginWithProvider = useCallback((provider: OAuthProvider) => signInWithProvider(provider), [])
  const logout = useCallback(() => logoutUser(), [])

  return (
    <AuthContext.Provider value={{ session, loading, login, register, loginWithProvider, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
