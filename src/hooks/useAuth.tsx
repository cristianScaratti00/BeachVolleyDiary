import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import Clarity from '@microsoft/clarity'
import { supabase } from '../lib/supabase'
import { useScelta } from '../lib/consenso'
import { closeLinkSession, loginUser, registerUser, logoutUser, resendConfirmation, sessionForUser, signInWithProvider } from '../lib/auth'
import type { Session, AuthResult, OAuthProvider } from '../lib/auth'
import { SESSIONE_DEL_LINK, pulisciIndirizzo, ritornoMostrato } from '../lib/ritorno'

interface AuthContextValue {
  session: Session | null
  loading: boolean // true finché non si conosce lo stato iniziale della sessione
  login: (email: string, password: string) => Promise<AuthResult>
  register: (name: string, email: string, password: string, confirm: string) => Promise<AuthResult>
  /** La mail di conferma di nuovo (link scaduto o già usato). */
  resend: (email: string) => Promise<AuthResult>
  loginWithProvider: (provider: OAuthProvider) => Promise<AuthResult>
  logout: () => Promise<void>
  refresh: () => Promise<void> // rilegge il profilo (es. dopo cambio avatar/piano)
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  // Il profilo arriva dalla rete: vince l'ultimo evento, non l'ultima
  // risposta (un SIGNED_IN lento non rimette una sessione appena chiusa).
  // Lo conta anche `refresh`, più sotto.
  const ultimo = useRef(0)
  // Arrivati dal link della mail di conferma, la sua sessione si chiude
  // prima di tutto: si atterra su Accedi (ritorno.ts), senza che l'app si
  // affacci per un attimo. Fino ad allora né gli eventi né `refresh` contano.
  const pronto = useRef(!SESSIONE_DEL_LINK)

  useEffect(() => {
    let attivo = true
    const applica = (user: Parameters<typeof sessionForUser>[0]) => {
      const n = ++ultimo.current
      sessionForUser(user).then((sess) => {
        if (!attivo || n !== ultimo.current) return
        setSession(sess)
        setLoading(false)
      })
    }
    const avvio = SESSIONE_DEL_LINK ? closeLinkSession().then(pulisciIndirizzo, pulisciIndirizzo) : Promise.resolve()
    // Sessione iniziale (ripristinata da localStorage da supabase-js)...
    void avvio.then(async () => {
      pronto.current = true
      const { data } = await supabase.auth.getSession()
      // La sessione del link non si è chiusa (senza rete): si resta dentro, e
      // «Email confermata, ora accedi» non ha più senso a un'uscita futura.
      if (SESSIONE_DEL_LINK && data.session) ritornoMostrato()
      applica(data.session?.user)
    })
    // ...e sincronizzazione ad ogni cambiamento (login / logout / refresh token).
    // Il callback resta sincrono (profilo caricato via .then) per evitare il
    // deadlock noto quando si await-a supabase-js dentro onAuthStateChange.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (pronto.current) applica(s?.user)
    })
    return () => {
      attivo = false
      sub.subscription.unsubscribe()
    }
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
  // `window.clarity(...)` senza try/catch (a differenza di `init`), e senza
  // consenso — o in sviluppo — quella funzione non esiste proprio.
  //
  // `consenso` sta fra le dipendenze e non solo nella condizione: chi accetta
  // dopo essere già entrato deve essere identificato subito, senza aspettare
  // un cambio di sessione che potrebbe non arrivare mai.
  const consenso = useScelta()
  useEffect(() => {
    if (!import.meta.env.PROD || consenso !== 'accettato' || !session?.id) return
    Clarity.identify(session.id)
  }, [session?.id, consenso])

  // Riallinea piano/ruolo rileggendo il profilo (senza rete sulla sessione: usa
  // quella locale). Serve perché un cambio piano lato admin non emette eventi
  // auth: senza questo, un utente declassato resterebbe "Premium" in memoria
  // finché non ricarica la pagina.
  //
  // Scatta anche al focus della pagina, quindi può partire mentre la sessione
  // del link si sta chiudendo o mentre si esce: un evento auth arrivato nel
  // frattempo vince, e il profilo letto qui si butta.
  const refresh = useCallback(async () => {
    if (!pronto.current) return
    const n = ultimo.current
    const { data } = await supabase.auth.getSession()
    if (!data.session?.user) return // non loggato: non toccare lo stato
    const sess = await sessionForUser(data.session.user)
    if (n === ultimo.current) setSession(sess)
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
    (name: string, email: string, password: string, confirm: string) => registerUser(name, email, password, confirm),
    [],
  )
  const resend = useCallback((email: string) => resendConfirmation(email), [])
  const loginWithProvider = useCallback((provider: OAuthProvider) => signInWithProvider(provider), [])
  const logout = useCallback(() => logoutUser(), [])

  return (
    <AuthContext.Provider value={{ session, loading, login, register, resend, loginWithProvider, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
