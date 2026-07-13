// ============================================================================
// Auth — Supabase Auth (email + password).
// La sessione (JWT) è gestita e persistita da supabase-js, con refresh
// automatico. Ruolo e piano dell'utente vengono letti dalla tabella `profiles`
// e inclusi nella sessione di dominio.
// ============================================================================
import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Role, Plan } from './db.enums'

export interface Session {
  email: string
  name: string
  role: Role // admin | user
  plan: Plan // base | premium
}

export interface AuthResult {
  ok: boolean
  error?: string
  session?: Session
}

// Provider social supportati per l'accesso OAuth.
export type OAuthProvider = 'google' | 'apple'

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Legge ruolo e piano dal profilo dell'utente (default prudenti se non c'è ancora).
async function fetchProfile(userId: string): Promise<{ role: Role; plan: Plan }> {
  const { data } = await supabase.from('profiles').select('role, plan').eq('id', userId).single()
  return {
    role: (data?.role as Role) ?? 'user',
    plan: (data?.plan as Plan) ?? 'base',
  }
}

// Costruisce la sessione di dominio { email, name, role, plan } dallo user Supabase.
export async function sessionForUser(user: User | null | undefined): Promise<Session | null> {
  if (!user) return null
  // Email+password salva `name`; Google/Apple usano `full_name`/`name` — prendi il primo.
  const meta = user.user_metadata ?? {}
  const name = ((meta.name ?? meta.full_name ?? meta.user_name) as string | undefined)?.trim()
  const email = user.email ?? ''
  const { role, plan } = await fetchProfile(user.id)
  return { email, name: name || email.split('@')[0] || 'Utente', role, plan }
}

export async function registerUser(name: string, email: string, password: string): Promise<AuthResult> {
  const n = name.trim()
  const e = email.trim().toLowerCase()
  if (!n) return { ok: false, error: 'Inserisci il tuo nome.' }
  if (!EMAIL_RE.test(e)) return { ok: false, error: 'Email non valida.' }
  if (password.length < 6) return { ok: false, error: 'La password deve avere almeno 6 caratteri.' }

  const { data, error } = await supabase.auth.signUp({
    email: e,
    password,
    options: { data: { name: n } },
  })
  if (error) return { ok: false, error: translateAuthError(error.message) }
  // Se la conferma email è attiva, signUp non restituisce una sessione.
  if (!data.session) {
    return { ok: false, error: 'Registrazione avvenuta: controlla la tua email per confermare l’account.' }
  }
  return { ok: true }
}

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  const e = email.trim().toLowerCase()
  if (!EMAIL_RE.test(e)) return { ok: false, error: 'Email non valida.' }
  if (!password) return { ok: false, error: 'Inserisci la password.' }

  const { error } = await supabase.auth.signInWithPassword({ email: e, password })
  if (error) return { ok: false, error: translateAuthError(error.message) }
  return { ok: true }
}

// Accesso/registrazione con un provider social (Google / Apple).
// Il metodo reindirizza il browser al provider; al ritorno supabase-js rileva la
// sessione dall'URL e `onAuthStateChange` (in useAuth) aggiorna lo stato.
// Il profilo viene creato automaticamente dal trigger `on_auth_user_created`.
export async function signInWithProvider(provider: OAuthProvider): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin,
      // Google: mostra il selettore account invece di entrare subito con l'ultimo.
      queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined,
    },
  })
  if (error) return { ok: false, error: translateAuthError(error.message) }
  return { ok: true } // in pratica il browser sta già reindirizzando
}

export async function logoutUser(): Promise<void> {
  await supabase.auth.signOut()
}

// Traduce in italiano i messaggi d'errore più comuni di Supabase Auth.
function translateAuthError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Credenziali non valide.'
  if (m.includes('already registered') || m.includes('already been registered') || m.includes('user already exists')) {
    return 'Email già registrata. Prova ad accedere.'
  }
  if (m.includes('email not confirmed')) return 'Email non confermata: controlla la tua casella di posta.'
  if (m.includes('password')) return 'Password non valida (minimo 6 caratteri).'
  if (m.includes('rate limit') || m.includes('too many')) return 'Troppi tentativi, riprova tra poco.'
  if (m.includes('provider is not enabled') || m.includes('unsupported provider')) {
    return 'Accesso con questo provider non ancora disponibile. Riprova più tardi.'
  }
  if (m.includes('popup') || m.includes('cancel')) return 'Accesso annullato.'
  if (m.includes('email')) return 'Email non valida.'
  return msg
}
