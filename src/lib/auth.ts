// ============================================================================
// Auth — Supabase Auth (email + password).
// La sessione (JWT) è gestita e persistita da supabase-js, con refresh
// automatico. Nome, ruolo e piano dell'utente vengono letti dalla tabella
// `profiles` (`full_name` è il nome mostrato ovunque) e inclusi nella sessione
// di dominio.
// ============================================================================
import type { User } from '@supabase/supabase-js'
import { track } from '@vercel/analytics'
import { supabase } from './supabase'
import type { Role, Plan } from './db.enums'

export interface Session {
  email: string
  name: string
  role: Role // admin | user
  plan: Plan // base | premium
  avatarUrl: string | null // foto profilo (bucket avatars)
  hasPassword: boolean // false per chi è entrato solo con Google/Apple
}

export interface AuthResult {
  ok: boolean
  error?: string
  notice?: string // messaggio informativo/di successo (es. conferma email inviata)
  session?: Session
}

// Esito del check di disponibilità del nickname (usato live in registrazione).
// 'unknown' = non è stato possibile verificare (rete/funzione non disponibile).
export type NameCheck = { status: 'available' | 'taken' | 'unknown'; error?: string }

// Verifica live se il nickname è libero, tramite la Edge Function `check-name`.
export async function checkNameAvailable(name: string): Promise<NameCheck> {
  const n = name.trim()
  if (!n) return { status: 'unknown' }
  try {
    const { data, error } = await supabase.functions.invoke('check-name', { body: { name: n } })
    if (error) return { status: 'unknown' }
    if (data && typeof data.available === 'boolean') {
      return data.available ? { status: 'available' } : { status: 'taken', error: data.error }
    }
  } catch {
    /* rete/funzione non disponibile */
  }
  return { status: 'unknown' }
}

// Provider social supportati per l'accesso OAuth.
export type OAuthProvider = 'google' | 'apple'

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Legge nome, ruolo e piano dal profilo dell'utente (default se non c'è ancora:
// con i piani sospesi il fallback è premium, come il default della colonna).
interface ProfileRow { fullName: string | null; role: Role; plan: Plan; avatarUrl: string | null }
async function fetchProfile(userId: string): Promise<ProfileRow> {
  const { data } = await supabase.from('profiles').select('full_name, role, plan, avatar_url').eq('id', userId).single()
  return {
    fullName: data?.full_name ?? null,
    role: (data?.role as Role) ?? 'user',
    plan: (data?.plan as Plan) ?? 'premium',
    avatarUrl: data?.avatar_url ?? null,
  }
}

// Ha un'identità email+password? Se no (solo Google/Apple) il cambio password
// non ha senso e la sezione va nascosta nel profilo.
function hasPasswordIdentity(user: User): boolean {
  const identities = user.identities?.map((i) => i.provider) ?? []
  if (identities.length) return identities.includes('email')
  const meta = user.app_metadata ?? {}
  const providers = (meta.providers as string[] | undefined) ?? (meta.provider ? [meta.provider as string] : [])
  return providers.includes('email')
}

// Costruisce la sessione di dominio { email, name, role, plan } dallo user Supabase.
// Il nome mostrato ovunque nell'app è `profiles.full_name`: è l'unica fonte di
// verità (ci lavorano anche il check di unicità e la ricerca utenti). I metadati
// auth restano solo come rete di sicurezza se il profilo non ha ancora un nome
// (es. riga appena creata dal trigger con metadati vuoti).
export async function sessionForUser(user: User | null | undefined): Promise<Session | null> {
  if (!user) return null
  const { fullName, role, plan, avatarUrl } = await fetchProfile(user.id)
  const meta = user.user_metadata ?? {}
  const fallback = ((meta.name ?? meta.full_name ?? meta.user_name) as string | undefined)?.trim()
  const email = user.email ?? ''
  return {
    email,
    name: fullName?.trim() || fallback || email.split('@')[0] || 'Utente',
    role,
    plan,
    avatarUrl,
    hasPassword: hasPasswordIdentity(user),
  }
}

// Cambia il nome visualizzato, cioè `profiles.full_name` (la RLS consente di
// aggiornare la propria riga; il trigger anti-escalation protegge solo role/plan).
export async function updateDisplayName(next: string, current: string): Promise<AuthResult> {
  const n = next.trim()
  if (!n) return { ok: false, error: 'Inserisci il tuo nome.' }
  if (n.length > 40) return { ok: false, error: 'Il nome è troppo lungo (massimo 40 caratteri).' }

  // Il check di unicità confronta con TUTTI i profili, incluso il proprio: se
  // cambiano solo le maiuscole dello stesso nome l'unico match sarebbe l'utente
  // stesso, quindi si salta. Fail-open come in registrazione.
  if (n.toLowerCase() !== current.trim().toLowerCase()) {
    const check = await checkNameAvailable(n)
    if (check.status === 'taken') {
      return { ok: false, error: check.error || 'Questo nome è già in uso, scegline un altro.' }
    }
  }

  const { data: auth } = await supabase.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return { ok: false, error: 'Sessione non valida, esci e rientra.' }

  const { error } = await supabase.from('profiles').update({ full_name: n }).eq('id', uid)
  if (error) return { ok: false, error: 'Non è stato possibile aggiornare il nome, riprova.' }
  return { ok: true, notice: 'Nome aggiornato.' }
}

// Cambia la password dell'utente loggato (nessuna vecchia password richiesta:
// Supabase si fida della sessione attiva).
export async function updatePassword(password: string, confirm: string): Promise<AuthResult> {
  if (password.length < 6) return { ok: false, error: 'La password deve avere almeno 6 caratteri.' }
  if (password !== confirm) return { ok: false, error: 'Le due password non coincidono.' }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { ok: false, error: translateAuthError(error.message) }
  track('password_cambiata')
  return { ok: true, notice: 'Password aggiornata.' }
}

export async function registerUser(name: string, email: string, password: string): Promise<AuthResult> {
  const n = name.trim()
  const e = email.trim().toLowerCase()
  if (!n) return { ok: false, error: 'Inserisci il tuo nome.' }
  if (!EMAIL_RE.test(e)) return { ok: false, error: 'Email non valida.' }
  if (password.length < 6) return { ok: false, error: 'La password deve avere almeno 6 caratteri.' }

  // Verifica che il nome non sia già usato da un altro utente (Edge Function).
  // Fail-open: se la function non risponde non blocchiamo la registrazione.
  try {
    const { data: check } = await supabase.functions.invoke('check-name', { body: { name: n } })
    if (check && check.available === false) {
      return { ok: false, error: check.error || 'Questo nome è già in uso, scegline un altro.' }
    }
  } catch {
    /* rete/funzione non disponibile: si prosegue con la registrazione */
  }

  const { data, error } = await supabase.auth.signUp({
    email: e,
    password,
    options: {
      data: { name: n },
      // La mail di conferma reindirizza all'app da cui ci si registra
      // (dev: localhost, prod: dominio), non al solo "Site URL" del progetto.
      // NB: l'URL dev'essere in Supabase → Auth → URL Configuration → Redirect URLs.
      emailRedirectTo: window.location.origin,
    },
  })
  if (error) return { ok: false, error: translateAuthError(error.message) }
  track('registrazione')
  // Se la conferma email è attiva, signUp non restituisce una sessione: NON è un
  // errore, è un successo con un avviso (mostrato in verde) di controllare la mail.
  if (!data.session) {
    return { ok: true, notice: 'Registrazione completata! Ti abbiamo inviato una mail di conferma: controlla la casella per attivare l’account, poi accedi.' }
  }
  return { ok: true }
}

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  const e = email.trim().toLowerCase()
  if (!EMAIL_RE.test(e)) return { ok: false, error: 'Email non valida.' }
  if (!password) return { ok: false, error: 'Inserisci la password.' }

  const { error } = await supabase.auth.signInWithPassword({ email: e, password })
  if (error) return { ok: false, error: translateAuthError(error.message) }
  track('login')
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
  track('logout')
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
  if (m.includes('different from the old password') || m.includes('same as the old')) {
    return 'La nuova password deve essere diversa da quella attuale.'
  }
  if (m.includes('reauthentication')) return 'Per sicurezza esci e rientra, poi riprova a cambiare la password.'
  if (m.includes('password')) return 'Password non valida (minimo 6 caratteri).'
  if (m.includes('rate limit') || m.includes('too many')) return 'Troppi tentativi, riprova tra poco.'
  if (m.includes('provider is not enabled') || m.includes('unsupported provider')) {
    return 'Accesso con questo provider non ancora disponibile. Riprova più tardi.'
  }
  if (m.includes('popup') || m.includes('cancel')) return 'Accesso annullato.'
  if (m.includes('email')) return 'Email non valida.'
  return msg
}
