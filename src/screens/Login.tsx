// ============================================================================
// Accesso e registrazione (UX §5 F0, §6.9). Si mostra su QUALUNQUE percorso
// senza sessione e non cambia l'URL: dopo l'accesso si arriva esattamente dove
// si voleva andare (UX §4.5).
//
// - Accedi / Registrati è un SegmentedControl (`aria-pressed`).
// - Ogni campo ha un'etichetta vera; il nome in registrazione si verifica dal
//   vivo, con l'esito annunciato in modo cortese.
// - Durante l'invio il pulsante dice «Attendere…» e i campi diventano
//   `readonly`: prima restavano modificabili mentre la richiesta era in volo.
// - Gli errori stanno sotto il modulo con `role="alert"`; la conferma email
//   è un avviso `role="status"`, si passa ad Accedi e l'email resta.
// - Senza rete non si prova nemmeno: lo si dice.
// La logica di autenticazione (useAuth, checkNameAvailable) non cambia.
// ============================================================================
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'
import { checkNameAvailable } from '../lib/auth'
import { useIsWide } from '../hooks/useMedia'
import { useOnline } from '../hooks/useConnection'
import { BrandLockup } from '../components/Logo'
import { Button, Icon, SegmentedControl, TextField } from '../components/ui/index'
import type { IconName } from '../components/ui/index'
import './Login.css'

type Mode = 'login' | 'register'
type NameStatus = 'idle' | 'checking' | 'available' | 'taken'

const OFFLINE = 'Sei offline: non posso verificare le credenziali.'

const FEATURES: { icon: IconName; text: string }[] = [
  { icon: 'chart', text: 'Statistiche di ogni stagione' },
  { icon: 'trophy', text: 'Tornei, partite e set' },
  { icon: 'people', text: 'Con chi giochi meglio' },
]

/** Il ritardo del controllo del nome: non si chiama la Edge Function a ogni tasto. */
const NOME_DEBOUNCE_MS = 450

export default function Login() {
  const wide = useIsWide()
  const online = useOnline()
  const { login, register } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [nameStatus, setNameStatus] = useState<NameStatus>('idle')
  const [nameMsg, setNameMsg] = useState('')

  const isRegister = mode === 'register'

  // Check live del nickname (solo in registrazione), con debounce.
  useEffect(() => {
    if (!isRegister) {
      setNameStatus('idle')
      return
    }
    const n = name.trim()
    if (n.length < 2) {
      setNameStatus('idle')
      return
    }
    setNameStatus('checking')
    let alive = true
    const t = setTimeout(async () => {
      const res = await checkNameAvailable(n)
      if (!alive) return
      if (res.status === 'available') {
        setNameStatus('available')
        setNameMsg('Nome disponibile')
      } else if (res.status === 'taken') {
        setNameStatus('taken')
        setNameMsg(res.error || 'Nome già in uso')
      } else {
        setNameStatus('idle')
        setNameMsg('')
      }
    }, NOME_DEBOUNCE_MS)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [name, isRegister])

  const switchMode = (m: Mode) => {
    if (busy) return
    setMode(m)
    setError('')
    setNotice('')
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setNotice('')
    if (!online) {
      setError(OFFLINE)
      return
    }
    setError('')
    setBusy(true)
    const r = isRegister ? await register(name, email, password) : await login(email, password)
    if (!r.ok) {
      setError(r.error || 'Si è verificato un errore.')
    } else if (r.notice) {
      // Registrazione con conferma email: si torna su Accedi, l'email resta.
      setNotice(r.notice)
      setMode('login')
      setPassword('')
    }
    setBusy(false)
    // Con l'accesso riuscito AuthProvider aggiorna la sessione e Root passa all'app.
  }

  const statoNome =
    nameStatus === 'checking'
      ? { icon: null, text: 'Verifico disponibilità…' }
      : nameStatus === 'available'
        ? { icon: 'check-circle' as const, text: nameMsg }
        : nameStatus === 'taken'
          ? { icon: 'alert' as const, text: nameMsg }
          : null

  return (
    <div className="login" data-wide={wide ? '' : undefined}>
      {wide && (
        <aside className="login-brand" data-surface="dark" aria-label="Beach Diary">
          <BrandLockup light bare size={72} />
          <div className="login-brand-body">
            <p className="login-brand-claim">Il tuo diario di beach volley.</p>
            <p className="login-brand-text">
              Segna tornei e partite, tieni i punteggi set per set e scopri i tuoi numeri stagione dopo stagione.
            </p>
            <ul className="login-brand-features">
              {FEATURES.map((f) => (
                <li key={f.text}>
                  <Icon name={f.icon} size={20} />
                  {f.text}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      )}

      <main className="login-main" id="contenuto">
        <div className="login-column">
          {!wide && (
            <div className="login-brand-mobile">
              <BrandLockup size={72} />
            </div>
          )}

          <section className="login-card" aria-labelledby="login-title">
            <h1 id="login-title" className="login-title">{isRegister ? 'Crea il tuo diario' : 'Bentornato'}</h1>
            <p className="login-sub">
              {isRegister ? 'Registrati per iniziare a tracciare le partite.' : 'Accedi per continuare il tuo diario.'}
            </p>

            <SegmentedControl
              label="Accedi o registrati"
              value={mode}
              onChange={(v) => switchMode(v as Mode)}
              options={[
                { value: 'login', label: 'Accedi' },
                { value: 'register', label: 'Registrati' },
              ]}
              className="login-segmented"
            />

            {!online && (
              <p className="login-offline" role="status">
                <Icon name="wifi-off" size={16} />
                <span>{OFFLINE}</span>
              </p>
            )}

            <form className="login-form" onSubmit={(e) => void submit(e)} noValidate>
              {isRegister && (
                <div className="login-name">
                  <TextField
                    label="Nome"
                    value={name}
                    onChange={setName}
                    placeholder="es. Marco"
                    autoComplete="name"
                    readOnly={busy}
                    aria-describedby="login-name-status"
                  />
                  {/* Sempre montata: si riempie quando c'è un esito, così lo annuncia. */}
                  <p id="login-name-status" className="login-name-status" data-status={nameStatus} aria-live="polite">
                    {name.trim().length >= 2 && statoNome && (
                      <>
                        {statoNome.icon && <Icon name={statoNome.icon} size={16} />}
                        <span>{statoNome.text}</span>
                      </>
                    )}
                  </p>
                </div>
              )}
              <TextField
                label="Email"
                type="email"
                inputMode="email"
                value={email}
                onChange={setEmail}
                placeholder="tu@email.com"
                autoComplete="email"
                readOnly={busy}
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder={isRegister ? 'Almeno 6 caratteri' : undefined}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                readOnly={busy}
              />

              {notice && (
                <p className="login-notice" role="status">
                  <Icon name="check-circle" size={16} />
                  <span>{notice}</span>
                </p>
              )}
              {error && (
                <p className="login-error" role="alert">
                  <Icon name="alert" size={16} />
                  <span>{error}</span>
                </p>
              )}

              <Button type="submit" variant="filled" size="lg" block busy={busy} busyLabel="Attendere…">
                {isRegister ? 'Crea account' : 'Entra'}
              </Button>
            </form>

            <p className="login-switch">
              {isRegister ? 'Hai già un account?' : 'Non hai un account?'}{' '}
              <button type="button" className="login-link" onClick={() => switchMode(isRegister ? 'login' : 'register')}>
                {isRegister ? 'Accedi' : 'Registrati'}
              </button>
            </p>
          </section>

          <p className="login-foot">I tuoi dati sono salvati in sicurezza sul cloud.</p>
        </div>
      </main>
    </div>
  )
}
