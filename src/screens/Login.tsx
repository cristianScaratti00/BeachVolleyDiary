// ============================================================================
// L'accesso del redesign (UX §5 F0, §6.9): tre viste sullo stesso tramonto.
//   - Benvenuto: il marchio, un carosello di tre messaggi (tablist con i
//     puntini, frecce da tastiera, swipe col dito), «Crea il tuo diario» e
//     «Ho già un account»;
//   - Accedi: «Bentornato.», email e password, «Entra»;
//   - Registrati, in due passi: il nickname (verificato dal vivo con
//     `check-name`), poi email e password. Il «‹» torna al passo prima.
//
// Si mostra su QUALUNQUE percorso senza sessione e non cambia l'URL: dopo
// l'accesso si arriva esattamente dove si voleva andare (UX §4.5). Per questo
// le viste sono stato interno e non rotte.
//
// Restano i patti di prima, che non sono estetici:
//   - ogni campo ha un'etichetta vera; durante l'invio il pulsante dice
//     «Attendere…» e i campi diventano `readonly`;
//   - gli errori sono `role="alert"`, la conferma email un `role="status"`:
//     si passa ad Accedi e l'email resta;
//   - senza rete non si prova nemmeno, e lo si dice.
// La logica di autenticazione (useAuth, checkNameAvailable) non cambia.
//
// «Password dimenticata?» non c'è: nel repo non esiste un flusso di recupero,
// e un link che non porta da nessuna parte è peggio di nessun link.
//
// L'accesso NON scorre: è alto esattamente quanto la parte visibile dello
// schermo, anche con la tastiera su (`useAccessoFermo`, più sotto). Le
// password si possono mostrare: l'occhio è di TextField.
// ============================================================================
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, FormEvent, KeyboardEvent, PointerEvent, ReactNode, RefObject } from 'react'
import * as m from 'motion/react-m'
import { AnimatePresence, useIsPresent } from 'motion/react'
import { useAuth } from '../hooks/useAuth'
import { checkNameAvailable } from '../lib/auth'
import { useOnline } from '../hooks/useConnection'
import { OGGI_ATTIVO } from '../app/routes'
import { BrandLockup } from '../components/Logo'
import { ENTRATA, MOLLA, SVELTO } from '../components/Motion'
import { LiquidGlass } from '../components/ui/LiquidGlass'
import { Button, Icon, TextField } from '../components/ui/index'
import { Scena } from './Login.scena'
import './Login.css'

type Vista = 'benvenuto' | 'accedi' | 'registrati'
type Passo = 1 | 2
type NameStatus = 'idle' | 'checking' | 'available' | 'taken'

const OFFLINE = 'Sei offline: non posso verificare le credenziali.'

/** Il ritardo del controllo del nome: non si chiama la Edge Function a ogni tasto. */
const NOME_DEBOUNCE_MS = 450
/** Lo stesso limite del nome nel Profilo (`updateDisplayName`). */
const NOME_MAX = 40
/** Quanto deve scorrere il dito in orizzontale perché il carosello cambi. */
const SWIPE_PX = 40
/**
 * Di quanto si deve accorciare la parte visibile perché sia la tastiera: le
 * barre di Safari che entrano ed escono valgono meno di 100, una tastiera
 * più di 250.
 */
const TASTIERA_PX = 150
/** Lo spazio sopra il campo a fuoco quando l'area del modulo deve scorrere fino a lui. */
const MARGINE_FUOCO = 16

// Le tre cose che l'app fa davvero. La terza nomina «Chi c'è oggi» solo se
// la funzione è accesa: un carosello non promette quello che non c'è.
const MESSAGGI = [
  { tab: 'Il diario', titolo: 'Ogni partita, nel tuo diario.', testo: 'Tornei, set e compagni: tutta la tua stagione in spiaggia, in un posto solo.' },
  { tab: 'Statistiche', titolo: 'Scopri come stai giocando.', testo: 'Percentuale di vittorie, serie record, punti di scarto. Stagione per stagione.' },
  {
    tab: 'Compagni',
    titolo: 'Trova con chi giochi meglio.',
    testo: OGGI_ATTIVO
      ? 'Confronta i compagni, condividi i tornei e scopri chi è in spiaggia oggi.'
      : 'Confronta i compagni e condividi i tornei che giocate insieme.',
  },
]

const rise = (i: number) => ({ className: 'rise', style: { '--rise-i': i } as CSSProperties })

/** Il parametro del deep link della landing: `/?accesso=registrati` o `/?accesso=accedi`. */
export const PARAM_ACCESSO = 'accesso'

/**
 * La vista con cui si apre l'accesso. La landing porta «Crea il tuo diario» a
 * `/?accesso=registrati` e «Ho già un account» a `/?accesso=accedi`, così il
 * Benvenuto non fa ripetere una scelta appena fatta (UX LC5). Qualunque altro
 * valore, o niente, è il Benvenuto.
 */
function vistaIniziale(): Vista {
  try {
    const v = new URLSearchParams(window.location.search).get(PARAM_ACCESSO)
    return v === 'registrati' || v === 'accedi' ? v : 'benvenuto'
  } catch {
    return 'benvenuto'
  }
}

/** Toglie `?accesso=` dall'indirizzo, lasciando il resto: si legge una volta sola. */
function togliParamAccesso() {
  try {
    const url = new URL(window.location.href)
    if (!url.searchParams.has(PARAM_ACCESSO)) return
    url.searchParams.delete(PARAM_ACCESSO)
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
  } catch {
    /* niente history (ambienti strani): il parametro resta, innocuo */
  }
}

export default function Login() {
  const online = useOnline()
  const { login, register } = useAuth()
  // Letta una volta, al montaggio; il parametro si toglie subito dopo, così un
  // ricaricamento o un «indietro» non riaprono la stessa vista.
  const [vista, setVista] = useState<Vista>(vistaIniziale)
  useEffect(togliParamAccesso, [])
  const [passo, setPasso] = useState<Passo>(1)
  const [direzione, setDirezione] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [nameStatus, setNameStatus] = useState<NameStatus>('idle')
  const [nameMsg, setNameMsg] = useState('')
  const [nameErr, setNameErr] = useState('')
  const nomeRef = useRef<HTMLInputElement>(null)
  const cornice = useRef<HTMLDivElement>(null)
  const area = useRef<HTMLElement>(null)
  useAccessoFermo(cornice, area)
  // La prima vista arriva col caricamento della pagina e non prende il focus;
  // da lì in poi ogni cambio di vista o di passo lo porta al nuovo titolo,
  // come la navigazione dell'app (UX §4.4).
  const navigato = useRef(false)

  const inRegistrazione = vista === 'registrati'

  // Controllo dal vivo del nickname (solo in registrazione), con debounce.
  useEffect(() => {
    if (!inRegistrazione) {
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
  }, [name, inRegistrazione])

  const vai = (v: Vista) => {
    if (busy) return
    navigato.current = true
    setVista(v)
    setPasso(1)
    setDirezione(1)
    setError('')
    setNotice('')
    setNameErr('')
  }

  // Passo 1 → 2. Il nome vuoto lo dice con le parole di `registerUser`; un
  // nome già preso lo dice già la riga sotto il campo, e il campo riprende il
  // focus. Se la verifica non ha risposto si prosegue: la registrazione
  // ricontrolla (fail-open, come prima).
  const continua = (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (!name.trim()) {
      setNameErr('Inserisci il tuo nome.')
      nomeRef.current?.focus()
      return
    }
    if (nameStatus === 'taken') {
      nomeRef.current?.focus()
      return
    }
    navigato.current = true
    setNameErr('')
    setError('')
    setDirezione(1)
    setPasso(2)
  }

  const passoIndietro = () => {
    if (busy) return
    navigato.current = true
    setError('')
    setDirezione(-1)
    setPasso(1)
  }

  const invia = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setNotice('')
    if (!online) {
      setError(OFFLINE)
      return
    }
    setError('')
    setBusy(true)
    const r = inRegistrazione ? await register(name, email, password) : await login(email, password)
    if (!r.ok) {
      setError(r.error || 'Si è verificato un errore.')
    } else if (r.notice) {
      // Registrazione con conferma email: si torna su Accedi, l'email resta.
      navigato.current = true
      setNotice(r.notice)
      setVista('accedi')
      setPassword('')
    }
    setBusy(false)
    // Con l'accesso riuscito AuthProvider aggiorna la sessione e Root passa all'app.
  }

  const messaggi = (
    <>
      {!online && <Avviso tipo="offline">{OFFLINE}</Avviso>}
      {notice && <Avviso tipo="conferma">{notice}</Avviso>}
      {error && <Avviso tipo="errore">{error}</Avviso>}
    </>
  )

  return (
    <div ref={cornice} className="accesso" data-surface="dark">
      <Scena inquadratura={vista} />
      <main ref={area} className="accesso-main" id="contenuto">
        <AnimatePresence mode="wait" initial={false}>
          {vista === 'benvenuto' ? (
            <Quadro key="benvenuto">
              <Benvenuto focus={navigato.current} onCrea={() => vai('registrati')} onAccedi={() => vai('accedi')} />
            </Quadro>
          ) : vista === 'accedi' ? (
            <Quadro key="accedi">
              <div className="accesso-top">
                <Indietro label="Indietro" onClick={() => vai('benvenuto')} />
              </div>
              <form className="accesso-fondo" onSubmit={(e) => void invia(e)} noValidate>
                <Titolo
                  focus={navigato.current}
                  {...rise(0)}
                  titolo="Bentornato."
                  sotto="Accedi per continuare il tuo diario."
                />
                <div {...rise(1)}>
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
                </div>
                <div {...rise(2)}>
                  <TextField
                    label="Password"
                    type="password"
                    value={password}
                    onChange={setPassword}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    readOnly={busy}
                  />
                </div>
                {messaggi}
                <div {...rise(3)}>
                  <Button type="submit" size="lg" block busy={busy} busyLabel="Attendere…" className="accesso-invia">
                    Entra
                  </Button>
                </div>
                <p className="accesso-cambio rise" style={{ '--rise-i': 4 } as CSSProperties}>
                  Non hai un account?{' '}
                  <button type="button" className="accesso-link" onClick={() => vai('registrati')}>
                    Registrati
                  </button>
                </p>
              </form>
            </Quadro>
          ) : (
            <Quadro key="registrati">
              <div className="accesso-top">
                {passo === 1 ? (
                  <Indietro label="Indietro" onClick={() => vai('benvenuto')} />
                ) : (
                  <Indietro label="Torna al passo precedente" onClick={passoIndietro} />
                )}
                <div
                  role="progressbar"
                  aria-label="Registrazione"
                  aria-valuemin={1}
                  aria-valuemax={2}
                  aria-valuenow={passo}
                  aria-valuetext={`Passo ${passo} di 2`}
                  className="accesso-progresso"
                >
                  <span className="accesso-segmento"><span data-pieno="" /></span>
                  <span className="accesso-segmento"><span data-pieno={passo === 2 ? '' : undefined} /></span>
                </div>
              </div>
              <div className="accesso-fondo">
                <AnimatePresence mode="wait" custom={direzione}>
                  {passo === 1 ? (
                    <PassoForm key="p1" direzione={direzione} onSubmit={continua}>
                      <Titolo
                        focus={navigato.current}
                        passo="Passo 1 di 2"
                        titolo="Come ti chiamano in spiaggia?"
                        sotto="Con questo nome ti trovano i compagni quando ti collegano ai loro tornei."
                      />
                      <Nickname
                        inputRef={nomeRef}
                        value={name}
                        onChange={(v) => {
                          setName(v)
                          setNameErr('')
                        }}
                        status={nameStatus}
                        msg={nameMsg}
                        error={nameErr}
                        busy={busy}
                      />
                      <Button type="submit" size="lg" block className="accesso-invia">
                        Continua
                      </Button>
                    </PassoForm>
                  ) : (
                    <PassoForm key="p2" direzione={direzione} onSubmit={(e) => void invia(e)}>
                      <Titolo
                        focus={navigato.current}
                        passo="Passo 2 di 2"
                        titolo={`Ciao ${name.trim()}, ultimo passo.`}
                        sotto="Email e password per ritrovare il tuo diario."
                      />
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
                        placeholder="Almeno 6 caratteri"
                        autoComplete="new-password"
                        readOnly={busy}
                      />
                      {messaggi}
                      <Button type="submit" size="lg" block busy={busy} busyLabel="Attendere…" className="accesso-invia">
                        Crea account
                      </Button>
                    </PassoForm>
                  )}
                </AnimatePresence>
                <p className="accesso-cambio">
                  Hai già un account?{' '}
                  <button type="button" className="accesso-link" onClick={() => vai('accedi')}>
                    Accedi
                  </button>
                </p>
              </div>
            </Quadro>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

/**
 * L'accesso sta fermo, alto quanto la parte visibile dello schermo. Finché è
 * montato:
 *  - `<html data-accesso>`: pagina e body non scorrono e non rimbalzano
 *    (Login.css). Si toglie all'uscita, e l'app torna a scorrere;
 *  - la cornice (`position: fixed`) segue il `visualViewport`: con la tastiera
 *    su iOS non accorcia il layout ma sposta la parte visibile (`offsetTop`).
 *    `--vv-h` e `--vv-top` la rimettono lì, a ogni `resize`/`scroll`, in un
 *    rAF e senza transizioni (la tastiera la anima iOS). Il modulo è ancorato
 *    in basso: finisce subito sopra la tastiera. Con lo zoom a pizzico la
 *    cornice si ferma, se no inseguirebbe la lente;
 *  - `data-tastiera` quando la parte visibile si accorcia di una tastiera: il
 *    margine della barra Home, che è sotto la tastiera, non serve più;
 *  - un dito che trascina non sposta niente: iOS farebbe scorrere la parte
 *    visibile e i campi sparirebbero sotto la tastiera. Restano liberi lo
 *    zoom (due dita, o pagina già ingrandita: UX §8.8) e ciò che scorre
 *    davvero, cioè l'area del modulo quando non ci sta (testo grande, iPhone
 *    SE in orizzontale): scorre lei, mai la pagina.
 */
function useAccessoFermo(cornice: RefObject<HTMLDivElement>, area: RefObject<HTMLElement>) {
  useLayoutEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-accesso', '')
    return () => root.removeAttribute('data-accesso')
  }, [])

  useLayoutEffect(() => {
    const vv = window.visualViewport
    const el = cornice.current
    if (!vv || !el) return
    let frame = 0
    let larga = -1
    let alta = 0 // la parte visibile più alta vista a questa larghezza: senza tastiera
    let prima = -1

    // Si sta scrivendo e l'area del modulo non ci sta: mostra il fondo (campi
    // e pulsante sopra la tastiera) e, se il campo a fuoco resta sopra,
    // risale fino a lui.
    const tieniInVista = () => {
      const a = area.current
      const f = document.activeElement
      if (!a || a.scrollHeight <= a.clientHeight) return
      if (!(f instanceof HTMLElement) || !a.contains(f) || !f.matches('input, textarea, select')) return
      a.scrollTop = a.scrollHeight
      const sopra = a.getBoundingClientRect().top + MARGINE_FUOCO - f.getBoundingClientRect().top
      if (sopra > 0) a.scrollTop -= sopra
    }

    const misura = () => {
      frame = 0
      if (vv.scale > 1.01) {
        el.style.removeProperty('--vv-h')
        el.style.removeProperty('--vv-top')
        el.removeAttribute('data-tastiera')
        return
      }
      const w = document.documentElement.clientWidth
      if (w !== larga) {
        larga = w
        alta = 0
      }
      alta = Math.max(alta, vv.height)
      el.style.setProperty('--vv-h', `${vv.height}px`)
      el.style.setProperty('--vv-top', `${vv.offsetTop}px`)
      el.toggleAttribute('data-tastiera', alta - vv.height > TASTIERA_PX)
      if (vv.height !== prima) {
        prima = vv.height
        tieniInVista()
      }
    }
    const pianifica = () => {
      if (!frame) frame = requestAnimationFrame(misura)
    }

    misura()
    vv.addEventListener('resize', pianifica)
    vv.addEventListener('scroll', pianifica)
    return () => {
      cancelAnimationFrame(frame)
      vv.removeEventListener('resize', pianifica)
      vv.removeEventListener('scroll', pianifica)
    }
  }, [cornice, area])

  useEffect(() => {
    // Si decide all'inizio del gesto: il dito è partito dentro qualcosa che
    // scorre davvero (l'area del modulo che non ci sta, o un dialogo sopra)?
    let libero = false
    const inizia = (e: TouchEvent) => {
      libero = false
      for (let el = e.target instanceof Element ? e.target : null; el && el !== document.body; el = el.parentElement) {
        if (el.scrollHeight > el.clientHeight && /auto|scroll/.test(getComputedStyle(el).overflowY)) {
          libero = true
          return
        }
      }
    }
    const blocca = (e: TouchEvent) => {
      if (libero || e.touches.length > 1 || (window.visualViewport?.scale ?? 1) > 1.01) return
      if (e.cancelable) e.preventDefault()
    }
    document.addEventListener('touchstart', inizia, { passive: true })
    document.addEventListener('touchmove', blocca, { passive: false })
    return () => {
      document.removeEventListener('touchstart', inizia)
      document.removeEventListener('touchmove', blocca)
    }
  }, [])
}

/**
 * Una vista: entra in dissolvenza (i blocchi dentro salgono da sé, `.rise`),
 * esce in SVELTO. Mentre esce non riceve più tocchi né fuoco.
 */
function Quadro({ children }: { children: ReactNode }) {
  const presente = useIsPresent()
  return (
    <m.div
      className="accesso-vista"
      {...(presente ? {} : { inert: '' })}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: ENTRATA }}
      exit={{ opacity: 0, transition: SVELTO }}
    >
      {children}
    </m.div>
  )
}

/** Un passo della registrazione: scivola dal lato verso cui si va. */
const SCIVOLA = {
  entra: (d: number) => ({ opacity: 0, x: 24 * d }),
  fermo: { opacity: 1, x: 0, transition: { x: MOLLA, opacity: ENTRATA } },
  esce: (d: number) => ({ opacity: 0, x: -24 * d, transition: SVELTO }),
}

function PassoForm({ direzione, onSubmit, children }: {
  direzione: number
  onSubmit: (e: FormEvent) => void
  children: ReactNode
}) {
  const presente = useIsPresent()
  return (
    <m.form
      className="accesso-passo"
      noValidate
      onSubmit={onSubmit}
      {...(presente ? {} : { inert: '' })}
      custom={direzione}
      variants={SCIVOLA}
      initial="entra"
      animate="fermo"
      exit="esce"
    >
      {children}
    </m.form>
  )
}

/** Il «‹» di vetro chiaro in alto a sinistra. Galleggia sulla scena: vetro liquido. */
function Indietro({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="accesso-indietro press" aria-label={label} onClick={onClick}>
      <LiquidGlass layer material="glass-clear" />
      <Icon name="chevron-left" size={20} />
    </button>
  )
}

/** Il titolo di una vista (h1, punto d'arrivo del focus) con la riga sotto. */
function Titolo({ focus, passo, titolo, sotto, className, style }: {
  focus: boolean
  passo?: string
  titolo: string
  sotto: string
  className?: string
  style?: CSSProperties
}) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (focus) ref.current?.focus({ preventScroll: true })
    // Solo all'arrivo della vista: è il punto d'arrivo di una navigazione.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className={className ? `accesso-testa ${className}` : 'accesso-testa'} style={style}>
      {passo && <p className="accesso-passo-n">{passo}</p>}
      <h1 ref={ref} tabIndex={-1} className="accesso-h1">{titolo}</h1>
      <p className="accesso-sotto">{sotto}</p>
    </div>
  )
}

/** Il nickname con la sua riga di stato dal vivo, sempre montata (così la annuncia). */
function Nickname({ inputRef, value, onChange, status, msg, error, busy }: {
  inputRef: RefObject<HTMLInputElement>
  value: string
  onChange: (v: string) => void
  status: NameStatus
  msg: string
  error: string
  busy: boolean
}) {
  const statoId = useId()
  const stato =
    status === 'checking'
      ? { icon: null, text: 'Verifico disponibilità…' }
      : status === 'available'
        ? { icon: 'check' as const, text: msg }
        : status === 'taken'
          ? { icon: 'alert' as const, text: msg }
          : null
  return (
    <div className="accesso-nome">
      <TextField
        ref={inputRef}
        label="Nickname"
        value={value}
        onChange={onChange}
        placeholder="es. Marco"
        autoComplete="nickname"
        maxLength={NOME_MAX}
        readOnly={busy}
        error={error || undefined}
        aria-describedby={statoId}
      />
      <p id={statoId} className="accesso-nome-stato" data-status={status} aria-live="polite">
        {value.trim().length >= 2 && stato && (
          <>
            {stato.icon && <Icon name={stato.icon} size={16} />}
            <span>{stato.text}</span>
          </>
        )}
      </p>
    </div>
  )
}

/** Errori (alert), conferma email e offline (status): sul buio, testo bianco e l'icona che dice il tipo. */
function Avviso({ tipo, children }: { tipo: 'errore' | 'conferma' | 'offline'; children: ReactNode }) {
  return (
    <p className="accesso-avviso" data-tipo={tipo} role={tipo === 'errore' ? 'alert' : 'status'}>
      <Icon name={tipo === 'errore' ? 'alert' : tipo === 'conferma' ? 'check-circle' : 'wifi-off'} size={16} />
      <span>{children}</span>
    </p>
  )
}

// ---------------------------------------------------------------- Benvenuto
const SLIDE = {
  entra: (d: number) => ({ opacity: 0, x: 16 * d }),
  fermo: { opacity: 1, x: 0, transition: { x: MOLLA, opacity: ENTRATA } },
  esce: (d: number) => ({ opacity: 0, x: -16 * d, transition: SVELTO }),
}

function Benvenuto({ focus, onCrea, onAccedi }: { focus: boolean; onCrea: () => void; onAccedi: () => void }) {
  const titolo = useRef<HTMLHeadingElement>(null)
  const [i, setI] = useState(0)
  const [dir, setDir] = useState(1)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const inizio = useRef<{ x: number; y: number } | null>(null)
  const base = useId()
  const pannello = `${base}-pannello`
  const n = MESSAGGI.length

  useEffect(() => {
    if (focus) titolo.current?.focus({ preventScroll: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const mostra = (k: number, d: number, conFocus = false) => {
    if (conFocus) tabs.current[k]?.focus()
    if (k === i) return
    setDir(d)
    setI(k)
  }

  // Le frecce girano in tondo (il pattern delle tab), Home e Fine agli estremi.
  const tasto = (e: KeyboardEvent<HTMLButtonElement>, k: number) => {
    const mosse: Record<string, [number, number]> = {
      ArrowRight: [(k + 1) % n, 1],
      ArrowLeft: [(k - 1 + n) % n, -1],
      Home: [0, -1],
      End: [n - 1, 1],
    }
    const mossa = mosse[e.key]
    if (!mossa) return
    e.preventDefault()
    mostra(mossa[0], mossa[1], true)
  }

  // Lo swipe: conta solo un gesto davvero orizzontale. Agli estremi si ferma
  // (come i puntini di iOS); `touch-action: pan-y` lascia lo scroll verticale
  // al browser.
  const giu = (e: PointerEvent<HTMLDivElement>) => {
    inizio.current = { x: e.clientX, y: e.clientY }
  }
  const su = (e: PointerEvent<HTMLDivElement>) => {
    const s = inizio.current
    inizio.current = null
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return
    if (dx < 0 && i < n - 1) mostra(i + 1, 1)
    else if (dx > 0 && i > 0) mostra(i - 1, -1)
  }

  const slide = MESSAGGI[i]

  return (
    <div className="accesso-fondo accesso-benvenuto">
      <h1 ref={titolo} tabIndex={-1} className="accesso-marchio rise">
        <BrandLockup size={24} bare light />
      </h1>

      <div
        id={pannello}
        role="tabpanel"
        aria-labelledby={`${base}-tab-${i}`}
        className="accesso-carosello"
        onPointerDown={giu}
        onPointerUp={su}
        onPointerCancel={() => {
          inizio.current = null
        }}
      >
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <m.div key={i} className="accesso-slide" custom={dir} variants={SLIDE} initial="entra" animate="fermo" exit="esce">
            <h2 className="accesso-slide-titolo">{slide.titolo}</h2>
            <p className="accesso-slide-testo">{slide.testo}</p>
          </m.div>
        </AnimatePresence>
      </div>

      <div role="tablist" aria-label="Cosa puoi fare" className="accesso-punti">
        {MESSAGGI.map((s, k) => (
          <button
            key={s.tab}
            ref={(el) => {
              tabs.current[k] = el
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${k}`}
            aria-selected={k === i}
            aria-controls={pannello}
            aria-label={s.tab}
            tabIndex={k === i ? 0 : -1}
            className="accesso-punto"
            onClick={() => mostra(k, k > i ? 1 : -1)}
            onKeyDown={(e) => tasto(e, k)}
          >
            <span className="accesso-punto-segno" aria-hidden="true" />
          </button>
        ))}
      </div>

      <div className="accesso-azioni rise" style={{ '--rise-i': 3 } as CSSProperties}>
        <Button size="lg" block onClick={onCrea}>
          Crea il tuo diario
        </Button>
        <Button variant="glass" material="glass-clear" size="lg" block onClick={onAccedi}>
          Ho già un account
        </Button>
      </div>

      {/* Termini e Informativa non sono ancora pagine del repo (né della
          landing): la nota resta testo, senza link che non portano altrove. */}
      <p className="accesso-nota rise" style={{ '--rise-i': 5 } as CSSProperties}>
        Continuando accetti i Termini e l’Informativa privacy.
      </p>
    </div>
  )
}
