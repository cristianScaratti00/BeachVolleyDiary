// ============================================================================
// Auth — Supabase Auth (email + password).
// La sessione (JWT) è gestita e persistita da supabase-js, con refresh
// automatico. Il nome utente è salvato nei `user_metadata` alla registrazione.
// La UI lavora su un tipo di dominio ridotto `Session = { email, name }`.
// ============================================================================
import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'

export interface Session {
  email: string
  name: string
}

export interface AuthResult {
  ok: boolean
  error?: string
  session?: Session
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Ricava la sessione di dominio { email, name } dallo user Supabase.
export function sessionFromUser(user: User | null | undefined): Session | null {
  if (!user) return null
  const name = (user.user_metadata?.name as string | undefined)?.trim()
  const email = user.email ?? ''
  return { email, name: name || email.split('@')[0] || 'Utente' }
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
  return { ok: true, session: sessionFromUser(data.user) ?? undefined }
}

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  const e = email.trim().toLowerCase()
  if (!EMAIL_RE.test(e)) return { ok: false, error: 'Email non valida.' }
  if (!password) return { ok: false, error: 'Inserisci la password.' }

  const { data, error } = await supabase.auth.signInWithPassword({ email: e, password })
  if (error) return { ok: false, error: translateAuthError(error.message) }
  return { ok: true, session: sessionFromUser(data.user) ?? undefined }
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
  if (m.includes('email')) return 'Email non valida.'
  return msg
}
