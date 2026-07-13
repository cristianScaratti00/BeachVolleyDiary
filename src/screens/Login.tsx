import { useState } from 'react'
import type { CSSProperties, ChangeEvent, FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useIsWide } from '../hooks/useMedia'
import type { OAuthProvider } from '../lib/auth'

type Mode = 'login' | 'register'

const inputStyle: CSSProperties = { width: '100%', border: '1px solid rgba(27,42,74,.16)', borderRadius: 11, padding: '12px 14px', font: "700 14px 'Nunito Sans'", background: '#fff' }

const oauthBtn = (variant: 'google' | 'apple', disabled: boolean): CSSProperties => ({
  width: '100%', padding: 12, borderRadius: 11, cursor: disabled ? 'default' : 'pointer',
  font: "700 14px 'Nunito Sans'", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  opacity: disabled ? 0.6 : 1,
  ...(variant === 'google'
    ? { background: '#fff', color: '#1B2A4A', border: '1px solid rgba(27,42,74,.2)' }
    : { background: '#000', color: '#fff', border: '1px solid #000' }),
})

// Logo Google ufficiale (4 colori).
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

// Logo Apple monocromatico (bianco).
function AppleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.42 2.2-1.12 2.98-.75.87-1.98 1.54-3.02 1.46-.13-1.1.42-2.24 1.07-2.95.73-.83 2.02-1.44 3.07-1.49zM20.9 17.36c-.55 1.27-.81 1.83-1.52 2.95-.99 1.56-2.39 3.5-4.12 3.51-1.54.02-1.93-1-4.02-.99-2.09.01-2.52 1.01-4.06.99-1.73-.02-3.05-1.77-4.04-3.33-2.77-4.36-3.06-9.48-1.35-12.2 1.21-1.93 3.13-3.06 4.93-3.06 1.83 0 2.98 1.01 4.49 1.01 1.47 0 2.36-1.01 4.48-1.01 1.6 0 3.3.87 4.51 2.38-3.96 2.17-3.32 7.82.27 9.75z" />
    </svg>
  )
}

const seg = (active: boolean): CSSProperties => ({
  flex: 1, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer',
  font: "700 13px 'Nunito Sans'",
  background: active ? '#fff' : 'transparent',
  color: active ? '#1B2A4A' : 'rgba(27,42,74,.5)',
  boxShadow: active ? '0 1px 3px rgba(27,42,74,.12)' : 'none',
})

const FEATURES = [
  { icon: '◧', text: 'Statistiche di ogni stagione' },
  { icon: '▤', text: 'Tornei, partite e set' },
  { icon: '◎', text: 'Con chi giochi meglio' },
]

function Brand({ light = false }: { light?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF6B35' }} />
      <div style={{ font: "600 17px 'Space Grotesk'", letterSpacing: '-.2px', color: light ? '#fff' : '#1B2A4A' }}>Beach Diary</div>
    </div>
  )
}

export default function Login() {
  const wide = useIsWide()
  const { login, register, loginWithProvider } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [oauthBusy, setOauthBusy] = useState<OAuthProvider | null>(null)

  const isRegister = mode === 'register'
  const anyBusy = busy || oauthBusy !== null

  const switchMode = (m: Mode) => { setMode(m); setError('') }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (anyBusy) return
    setError('')
    setBusy(true)
    const r = isRegister ? await register(name, email, password) : await login(email, password)
    if (!r.ok) setError(r.error || 'Si è verificato un errore.')
    setBusy(false)
    // On success the AuthProvider updates the session and <Root/> swaps to the app.
  }

  const oauth = async (provider: OAuthProvider) => {
    if (anyBusy) return
    setError('')
    setOauthBusy(provider)
    const r = await loginWithProvider(provider)
    // In caso di successo il browser reindirizza al provider; qui gestisco solo l'errore.
    if (!r.ok) { setError(r.error || 'Accesso non riuscito.'); setOauthBusy(null) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#FAF8F5' }}>
      {/* left brand panel (desktop) */}
      {wide && (
        <div style={{ width: '44%', maxWidth: 520, background: '#1B2A4A', color: '#fff', padding: '48px 44px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg,rgba(255,255,255,.04) 0 10px,transparent 10px 20px)' }} />
          <div style={{ position: 'relative' }}><Brand light /></div>
          <div style={{ flex: 1 }} />
          <div style={{ position: 'relative' }}>
            <div className="num" style={{ fontSize: 34, fontWeight: 500, lineHeight: 1.12, letterSpacing: '-.8px' }}>Il tuo diario di<br />beach volley.</div>
            <div style={{ font: "600 15px 'Nunito Sans'", color: 'rgba(255,255,255,.62)', marginTop: 14, maxWidth: 360 }}>Segna tornei e partite, tieni i punteggi set per set e scopri i tuoi numeri stagione dopo stagione.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 30 }}>
              {FEATURES.map((f) => (
                <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 12, font: "700 14px 'Nunito Sans'", color: 'rgba(255,255,255,.9)' }}>
                  <span style={{ fontSize: 16, color: '#FF6B35' }}>{f.icon}</span>{f.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* form panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          {!wide && <div style={{ marginBottom: 22, display: 'flex', justifyContent: 'center' }}><Brand /></div>}

          <div className="card" style={{ padding: '28px 26px' }}>
            <div className="num" style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-.4px' }}>{isRegister ? 'Crea il tuo diario' : 'Bentornato'}</div>
            <div style={{ font: "600 13.5px 'Nunito Sans'", color: 'rgba(27,42,74,.55)', marginTop: 4 }}>{isRegister ? 'Registrati per iniziare a tracciare le partite.' : 'Accedi per continuare il tuo diario.'}</div>

            {/* segmented toggle */}
            <div style={{ display: 'flex', background: '#F2F0EC', borderRadius: 10, padding: 4, gap: 4, marginTop: 20 }}>
              <button type="button" onClick={() => switchMode('login')} style={seg(!isRegister)}>Accedi</button>
              <button type="button" onClick={() => switchMode('register')} style={seg(isRegister)}>Registrati</button>
            </div>

            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>
              {isRegister && (
                <div>
                  <div className="lbl" style={{ marginBottom: 6 }}>Nome</div>
                  <input value={name} onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="es. Marco" autoComplete="name" style={inputStyle} />
                </div>
              )}
              <div>
                <div className="lbl" style={{ marginBottom: 6 }}>Email</div>
                <input type="email" value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} placeholder="tu@email.com" autoComplete="email" style={inputStyle} />
              </div>
              <div>
                <div className="lbl" style={{ marginBottom: 6 }}>Password</div>
                <input type="password" value={password} onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} placeholder={isRegister ? 'Almeno 6 caratteri' : '••••••••'} autoComplete={isRegister ? 'new-password' : 'current-password'} style={inputStyle} />
              </div>

              {error && <div style={{ font: "700 12.5px 'Nunito Sans'", color: '#FF477E', background: 'rgba(255,71,126,.08)', border: '1px solid rgba(255,71,126,.25)', borderRadius: 10, padding: '9px 12px' }}>{error}</div>}

              <button type="submit" disabled={anyBusy} className="chip" style={{ width: '100%', padding: 13, borderRadius: 11, border: 'none', cursor: anyBusy ? 'default' : 'pointer', background: '#FF6B35', color: '#fff', font: "700 14.5px 'Nunito Sans'", marginTop: 2, opacity: anyBusy ? 0.7 : 1 }}>
                {busy ? 'Attendere…' : isRegister ? 'Crea account' : 'Entra'}
              </button>
            </form>

            {/* divisore */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(27,42,74,.12)' }} />
              <span style={{ font: "700 11px 'Nunito Sans'", color: 'rgba(27,42,74,.4)', letterSpacing: '.4px' }}>oppure</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(27,42,74,.12)' }} />
            </div>

            {/* accesso social */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button type="button" onClick={() => oauth('google')} disabled={anyBusy} className="chip" style={oauthBtn('google', anyBusy)}>
                <GoogleIcon />{oauthBusy === 'google' ? 'Attendere…' : `${isRegister ? 'Registrati' : 'Continua'} con Google`}
              </button>
              <button type="button" onClick={() => oauth('apple')} disabled={anyBusy} className="chip" style={oauthBtn('apple', anyBusy)}>
                <AppleIcon />{oauthBusy === 'apple' ? 'Attendere…' : `${isRegister ? 'Registrati' : 'Continua'} con Apple`}
              </button>
            </div>

            <div style={{ font: "600 13px 'Nunito Sans'", color: 'rgba(27,42,74,.55)', textAlign: 'center', marginTop: 16 }}>
              {isRegister ? 'Hai già un account? ' : 'Non hai un account? '}
              <span className="chip" onClick={() => switchMode(isRegister ? 'login' : 'register')} style={{ color: '#FF6B35', fontWeight: 700, cursor: 'pointer' }}>
                {isRegister ? 'Accedi' : 'Registrati'}
              </span>
            </div>
          </div>

          <div style={{ font: "600 11.5px 'Nunito Sans'", color: 'rgba(27,42,74,.4)', textAlign: 'center', marginTop: 14 }}>
            I tuoi dati sono salvati in sicurezza sul cloud.
          </div>
        </div>
      </div>
    </div>
  )
}
