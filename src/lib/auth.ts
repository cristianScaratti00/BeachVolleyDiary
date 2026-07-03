// ============================================================================
// Auth demo/locale — gate lato client, nessun backend.
// La sessione e l'anagrafica utenti stanno in localStorage.
// ⚠️ Le password sono salvate in chiaro: va bene SOLO come demo, non è
// sicurezza reale. Per la produzione usare Supabase Auth (schema già pronto).
// ============================================================================
export interface Session {
  email: string
  name: string
}

interface StoredUser {
  email: string
  name: string
  password: string
}

export interface AuthResult {
  ok: boolean
  error?: string
  session?: Session
}

const SESSION_KEY = 'bvd_session'
const USERS_KEY = 'bvd_users'

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw) return JSON.parse(raw) as Session
  } catch (e) { /* ignore */ }
  return null
}

function saveSession(s: Session): void {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)) } catch (e) { /* ignore */ }
}

export function clearSession(): void {
  try { localStorage.removeItem(SESSION_KEY) } catch (e) { /* ignore */ }
}

function loadUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (raw) return JSON.parse(raw) as StoredUser[]
  } catch (e) { /* ignore */ }
  return []
}

function saveUsers(users: StoredUser[]): void {
  try { localStorage.setItem(USERS_KEY, JSON.stringify(users)) } catch (e) { /* ignore */ }
}

export function registerUser(name: string, email: string, password: string): AuthResult {
  const n = name.trim()
  const e = email.trim().toLowerCase()
  if (!n) return { ok: false, error: 'Inserisci il tuo nome.' }
  if (!EMAIL_RE.test(e)) return { ok: false, error: 'Email non valida.' }
  if (password.length < 6) return { ok: false, error: 'La password deve avere almeno 6 caratteri.' }
  const users = loadUsers()
  if (users.some((u) => u.email === e)) return { ok: false, error: 'Email già registrata. Prova ad accedere.' }
  users.push({ email: e, name: n, password })
  saveUsers(users)
  const session: Session = { email: e, name: n }
  saveSession(session)
  return { ok: true, session }
}

export function loginUser(email: string, password: string): AuthResult {
  const e = email.trim().toLowerCase()
  if (!EMAIL_RE.test(e)) return { ok: false, error: 'Email non valida.' }
  if (!password) return { ok: false, error: 'Inserisci la password.' }
  const user = loadUsers().find((u) => u.email === e)
  if (!user || user.password !== password) return { ok: false, error: 'Credenziali non valide.' }
  const session: Session = { email: user.email, name: user.name }
  saveSession(session)
  return { ok: true, session }
}
