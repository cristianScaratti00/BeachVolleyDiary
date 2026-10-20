// ============================================================================
// L'assistente guidato (UX §5 F11, §6.10; MOTION.md §5 F11; design 14): la
// creazione del torneo come conversazione con Pallo. È un percorso
// FACOLTATIVO (risposta 6): ci si arriva dal ＋ («Raccontalo a Solby»), dallo
// sheet «Nuovo torneo», dagli stati vuoti e da `/crea`.
//
// Il copione sta in `crea/copione.ts`, lo stato in `crea/useAssistente.ts`;
// qui la vista:
// - in cima la testata (× di vetro, la testa di Pallo — che pensa mentre
//   «scrive» — «Pallo» e il passo);
// - la trascrizione con le nuvolette (Pallo bianca col filo, le tue arancio),
//   che entrano con un filo di rimbalzo, e i tre puntini «sta scrivendo»;
// - sotto l'ultima nuvoletta le risposte rapide, pillole di vetro;
// - in fondo, sopra la conversazione, la capsula di vetro liquido col campo e
//   il pulsante arancio «Invia». Il campo c'è sempre: dove la domanda ha delle
//   scelte, quello che scrivi vale la scelta che gli corrisponde (o un nome
//   nuovo, per compagno e luogo); se non corrisponde a niente Pallo lo dice.
//
// Le correzioni obbligatorie di UX F11: ogni scelta è un `<button>`, dopo ogni
// domanda il focus va al primo controllo (il campo, sui passi da scrivere; la
// prima scelta, altrimenti), i campi hanno un nome (la domanda), il pulsante
// d'invio si chiama «Invia».
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, FormEvent, ReactNode } from 'react'
import { useReducedMotion } from 'motion/react'
import { BRACKETS, CATEGORIES, FORMATS, PHASES, SURFACES } from '../lib/db.enums'
import type { Option, Placement } from '../lib/models'
import type { CreaChatProps } from '../app/contracts'
import { Button, IconButton } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { LiquidGlass } from '../components/ui/LiquidGlass'
import { focusables } from '../components/ui/overlay'
import { Pallo } from '../components/Pallo'
import { RigaSet, SetIntestazione } from '../components/modals/RigaSet'
import { FINISHED_PLACEMENTS, PASSI, fmtSets, passoDi, righeRiepilogo, shiftISO, todayISO, trovaRisposta } from './crea/copione'
import type { Draft } from './crea/copione'
import { useAssistente } from './crea/useAssistente'
import type { Assistente, Msg } from './crea/useAssistente'
import './CreaChat.css'

/** Si segue il fondo della trascrizione solo se ci si è già vicini (MOTION.md §5 F11). */
const VICINO_AL_FONDO = 80

/** iOS non ridimensiona il layout con la tastiera: la colonna segue il visualViewport. */
function useAltezzaVisibile(): number | null {
  const [h, setH] = useState<number | null>(null)
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null
    if (!vv) return
    const on = () => setH(Math.abs(window.innerHeight - vv.height) > 80 ? vv.height : null)
    vv.addEventListener('resize', on)
    on()
    return () => vv.removeEventListener('resize', on)
  }, [])
  return h
}

export default function CreaChat({ partners, venues, onCreate, onDone, onExit, registerExitGuard }: CreaChatProps) {
  const a = useAssistente({ partners, venues, onCreate })
  const ridotto = useReducedMotion()
  const scrollRef = useRef<HTMLDivElement>(null)
  const dockRef = useRef<HTMLDivElement>(null)
  const campoRef = useRef<HTMLInputElement>(null)
  const vicino = useRef(true)
  const altezza = useAltezzaVisibile()
  const p = descriviPasso(a, partners, venues, onDone)

  // Il tasto indietro equivale a ✕, con la stessa conferma (UX F11.6).
  const isDirty = useRef(a.isDirty)
  isDirty.current = a.isDirty
  useEffect(() => {
    const off = registerExitGuard?.(() => isDirty.current()) as unknown
    return () => {
      if (typeof off === 'function') (off as () => void)()
    }
  }, [registerExitGuard])

  // Dopo ogni domanda il focus va al primo controllo, quando la nuvoletta è
  // già nel DOM (non a fine animazione): il campo sui passi da scrivere, la
  // prima risposta rapida altrimenti (UX F11.2).
  const campoPrimo = !!p.campo?.primo
  useEffect(() => {
    if (campoPrimo) {
      campoRef.current?.focus({ preventScroll: true })
      return
    }
    const dock = dockRef.current
    if (dock) focusables(dock)[0]?.focus({ preventScroll: true })
  }, [a.focusTick]) // eslint-disable-line react-hooks/exhaustive-deps

  // In fondo alla trascrizione solo se l'utente era già lì: chi sta rileggendo
  // più su non viene strappato via.
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !vicino.current) return
    // jsdom (e qualche browser incorporato) non ha `scrollTo` sugli elementi.
    if (typeof el.scrollTo === 'function') el.scrollTo({ top: el.scrollHeight, behavior: ridotto ? 'auto' : 'smooth' })
    else el.scrollTop = el.scrollHeight
  }, [a.messages, a.typing, a.step, ridotto])

  const conDock = a.step !== 'saving' && a.step !== 'boot'
  const vuoto = !a.text.trim()
  const inviabile = !!p.campo && (!vuoto || !!p.campo.vuotoOk)
  const passo = a.step === 'done' ? 'fatto' : `passo ${passoDi(a.step)} di ${PASSI}`

  const invia = (e: FormEvent) => {
    e.preventDefault()
    if (!p.campo || !inviabile) return
    p.campo.invia(a.text)
  }

  return (
    <div className="crea" style={altezza ? { height: altezza } : undefined}>
      <header className="crea-head">
        <IconButton icon="close" label="Chiudi l'assistente" variant="glass" iconSize={20} onClick={() => onExit(a.isDirty())} />
        {/* Mentre «scrive» pensa (occhi in alto, mano sul mento); a torneo
            creato è contento. Gli occhi seguono il dito. */}
        <Pallo umore={a.typing ? 'pensa' : a.step === 'done' ? 'contento' : 'testa'} soloTesta size={38} segui />
        <div className="crea-title">
          <h1 tabIndex={-1}>Solby</h1>
          <p>Nuovo torneo · {passo}</p>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="crea-scroll ui-scroll"
        onScroll={(e) => {
          const el = e.currentTarget
          vicino.current = el.scrollHeight - el.scrollTop - el.clientHeight <= VICINO_AL_FONDO
        }}
      >
        <div className="crea-log" role="log" aria-live="polite" aria-label="Conversazione con Solby">
          {a.messages.map((m) => (
            <Bubble key={m.id} m={m} partners={partners} venues={venues} />
          ))}
          {a.typing && <Typing />}
        </div>

        {conDock && (
          <div
            ref={dockRef}
            className="crea-dock"
            // Mentre Pallo "scrive" le risposte restano montate (smontarle
            // faceva cadere il focus sul body) e attenuate; qualunque input le
            // sveglia.
            data-attesa={a.typing ? '' : undefined}
            aria-busy={a.typing || undefined}
            onPointerDownCapture={a.interrompi}
            onKeyDownCapture={a.interrompi}
          >
            {p.scelte}
          </div>
        )}
      </div>

      {/* La capsula in fondo galleggia sopra la conversazione (design 14). */}
      <form className="crea-bar" onSubmit={invia} onPointerDownCapture={a.interrompi} onKeyDownCapture={a.interrompi}>
        <div className="crea-field">
          <LiquidGlass layer />
          <input
            ref={campoRef}
            className="crea-input"
            value={a.text}
            onChange={(e) => a.setText(e.target.value)}
            placeholder={p.campo?.placeholder ?? 'Scrivi una risposta…'}
            // Il nome del campo è la domanda (UX F11.3).
            aria-label={a.domandaCorrente ?? 'Scrivi a Solby'}
            autoComplete="off"
            enterKeyHint="send"
            disabled={!p.campo}
          />
        </div>
        <button type="submit" className="crea-send" aria-label="Invia" aria-disabled={inviabile ? undefined : true}>
          <Icon name="arrow-up" size={20} />
        </button>
      </form>
    </div>
  )
}

// =============================================================== trascrizione

function Bubble({ m, partners, venues }: { m: Msg; partners: Option[]; venues: Option[] }) {
  return (
    <div className="crea-msg" data-role={m.role}>
      <div className="crea-bubble">
        {m.role === 'user' && <span className="sr-only">Tu: </span>}
        {m.recap ? <Recap d={m.recap} partners={partners} venues={venues} /> : m.text}
      </div>
    </div>
  )
}

/** L'unico indicatore "sta scrivendo" (UX §6.10): la nuvoletta coi tre puntini. */
function Typing() {
  return (
    <div className="crea-msg" data-role="ai">
      <div className="crea-bubble crea-typing">
        <span className="crea-dots" aria-hidden="true">
          <span style={{ '--i': 0 } as CSSProperties} />
          <span style={{ '--i': 1 } as CSSProperties} />
          <span style={{ '--i': 2 } as CSSProperties} />
        </span>
        <span className="sr-only">Solby sta scrivendo</span>
      </div>
    </div>
  )
}

function Recap({ d, partners, venues }: { d: Draft; partners: Option[]; venues: Option[] }) {
  return (
    <div className="crea-recap">
      <p className="crea-recap-title">Riepilogo torneo</p>
      <dl className="crea-recap-rows">
        {righeRiepilogo(d, { partners, venues }).map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {d.matches.length > 0 && (
        <>
          <p className="crea-recap-title">{d.matches.length === 1 ? '1 partita' : `${d.matches.length} partite`}</p>
          <ul className="crea-recap-matches">
            {d.matches.map((m, i) => (
              <li key={i}>
                <span className="crea-recap-match">
                  <span className="crea-recap-phase">{m.phase} · </span>
                  {m.opponents}
                </span>
                <span className="crea-recap-sets">{fmtSets(m.sets)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

// =============================================================== il passo

/** Una risposta rapida: si tocca, oppure si scrive (`testo`). */
interface Risposta {
  testo: string
  label?: ReactNode
  scegli: () => void
}

interface Passo {
  /** Sotto l'ultima nuvoletta: risposte rapide, la data, i set, le azioni. */
  scelte: ReactNode
  /** Il campo in fondo. Assente = spento (i set, il riepilogo, la fine). */
  campo?: {
    placeholder?: string
    invia: (testo: string) => void
    /** Il campo vuoto si può inviare (gli avversari diventano «Avversari»). */
    vuotoOk?: boolean
    /** Il passo si risponde scrivendo: il focus va al campo. */
    primo?: boolean
  }
}

function descriviPasso(a: Assistente, partners: Option[], venues: Option[], onDone: (id: string) => void): Passo {
  const h = a.handlers
  const q = a.domandaCorrente ?? ''

  // La risposta toccata pulisce quello che era rimasto scritto nel campo.
  const r = (testo: string, scegli: () => void, label?: ReactNode): Risposta => ({
    testo,
    label,
    scegli: () => {
      a.setText('')
      scegli()
    },
  })

  /** Un passo a scelte: le pillole, e il campo che le riconosce per nome. */
  const scelte = (risposte: Risposta[], libero?: (t: string) => void, extra?: ReactNode): Passo => ({
    scelte: (
      <>
        <Chips label={q} risposte={risposte} />
        {extra}
      </>
    ),
    campo: {
      invia: (t) => {
        const i = trovaRisposta(t, risposte.map((x) => x.testo))
        if (i >= 0) risposte[i].scegli()
        else if (libero) libero(t)
        else h.nonCapito(t)
      },
    },
  })

  /** Un passo da scrivere, con al più un'alternativa («Salta», «Da solo»). */
  const scrivi = (placeholder: string, invia: (t: string) => void, alternative: Risposta[] = [], vuotoOk = false): Passo => ({
    scelte: alternative.length ? <Chips label="Alternative" risposte={alternative} /> : null,
    campo: { placeholder, invia, vuotoOk, primo: true },
  })

  switch (a.step) {
    case 'name':
      return scrivi('es. Summer Cup Rimini', h.submitName)

    case 'partner':
      // Senza compagni salvati una lista non ha senso: si chiede il nome (o "Da solo").
      if (!partners.length) return scrivi('es. Giulia', (t) => h.submitPartnerName(t, false), [r('Ho giocato da solo', h.pickNoPartner)])
      return scelte(
        [...partners.map((p) => r(p.name, () => h.pickPartner(p))), r('Nuovo compagno', h.chooseNewPartner), r('Da solo', h.pickNoPartner)],
        // Un nome che non c'è è un compagno nuovo.
        (t) => h.submitPartnerName(t, false),
      )

    case 'partnerName':
      return scrivi('es. Giulia', (t) => h.submitPartnerName(t, false))
    case 'resultsPartnerName':
      return scrivi('es. Giulia', (t) => h.submitPartnerName(t, true))

    case 'resultsPartner':
      return scelte(
        partners.map((p) => r(p.name, () => h.pickResultsPartner(p))),
        (t) => h.submitPartnerName(t, true),
      )

    case 'date':
      return scelte(
        [
          r('Oggi', () => h.pickDate(todayISO(), 'Oggi')),
          r('Ieri', () => h.pickDate(shiftISO(-1), 'Ieri')),
          r('Settimana scorsa', () => h.pickDate(shiftISO(-7), 'La scorsa settimana')),
        ],
        undefined,
        <form
          className="crea-form"
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            h.pickDateValue()
          }}
        >
          <label className="sr-only" htmlFor="crea-data">Un altro giorno</label>
          <input id="crea-data" type="date" className="ui-input crea-date" value={a.dateVal} onChange={(e) => a.setDateVal(e.target.value)} />
          <Button type="submit" variant="glass">Usa questa data</Button>
        </form>,
      )

    case 'venue':
      if (!venues.length) return scrivi('es. Bagno 26 Riccione', h.submitVenueName, [r('Salta', h.skipVenue)])
      return scelte(
        [...venues.map((v) => r(v.name, () => h.pickVenue(v))), r('Nuovo luogo', h.chooseNewVenue), r('Salta', h.skipVenue)],
        // Un posto che non c'è è un luogo nuovo.
        h.submitVenueName,
      )

    case 'venueName':
      return scrivi('es. Bagno 26 Riccione', h.submitVenueName)

    case 'category':
      return scelte(CATEGORIES.map((c) => r(c, () => h.pickCategory(c))))
    case 'format':
      return scelte(FORMATS.map((f) => r(f, () => h.pickFormat(f))))
    case 'surface':
      return scelte(SURFACES.map((s) => r(s, () => h.pickSurface(s))))

    case 'status':
      return scelte([r('È finito', () => h.pickStatus('finished')), r('È ancora in corso', () => h.pickStatus('ongoing'))])

    case 'placement':
      return scelte(FINISHED_PLACEMENTS.map((p) => r(p.replace(/\s*🏆\s*/u, ''), () => h.pickPlacement(p), <Piazzamento p={p} />)))

    case 'bracket':
      return scelte([...BRACKETS.map((b) => r(b, () => h.pickBracket(b))), r('Nessun tabellone', () => h.pickBracket(''))])

    case 'askResults':
      return scelte([r('Sì, aggiungiamole', () => h.answerResults(true)), r('No, va bene così', () => h.answerResults(false))])

    case 'matchOpponents':
      return scrivi('es. Bianchi / Verdi', h.submitOpponents, [r('Senza nome', () => h.submitOpponents(''))], true)

    case 'matchPhase':
      return scelte(PHASES.map((ph) => r(ph, () => h.pickPhase(ph))))

    case 'matchScore':
      return { scelte: <ScoreDock a={a} /> }

    case 'matchMore':
      return scelte([r('Aggiungi partita', () => h.answerMore(true)), r('Ho finito', () => h.answerMore(false))])

    case 'recap':
      return {
        scelte: (
          <div className="crea-actions" role="group" aria-label={q}>
            <Button variant="filled" onClick={() => void h.confirmCreate()}>Crea torneo</Button>
            <Button variant="glass" onClick={h.restart}>Ricomincia</Button>
          </div>
        ),
      }

    case 'done':
      return {
        scelte: (
          <div className="crea-actions">
            <Button variant="filled" onClick={() => a.createdId && onDone(a.createdId)}>Apri il torneo</Button>
            <Button variant="glass" onClick={h.restart}>Crea un altro</Button>
          </div>
        ),
      }

    default:
      return { scelte: null }
  }
}

function Piazzamento({ p }: { p: Placement }) {
  if (!/🏆/u.test(p)) return <>{p}</>
  const v = p.replace(/\s*🏆\s*/u, '')
  return (
    <>
      <Icon name="trophy" size={16} />
      <span aria-hidden="true">{v}</span>
      <span className="sr-only">{v.replace('1°', 'Primo posto')}</span>
    </>
  )
}

// ---------------------------------------------------------------- atomi

/** Le risposte rapide: pillole di vetro alte 38 che vanno a capo. */
function Chips({ label, risposte }: { label: string; risposte: Risposta[] }) {
  return (
    <div className="crea-chips" role="group" aria-label={label}>
      {risposte.map((x) => (
        <button key={x.testo} type="button" className="crea-chip" onClick={x.scegli}>
          <LiquidGlass layer />
          {x.label ?? x.testo}
        </button>
      ))}
    </div>
  )
}

function ScoreDock({ a }: { a: Assistente }) {
  const rows = a.scoreRows
  const h = a.handlers
  const update = (i: number, key: 'us' | 'them', v: string) =>
    a.setScoreRows(rows.map((r, j) => (j === i ? { ...r, [key]: v } : r)))
  const removeRow = (i: number) => a.setScoreRows(rows.filter((_, j) => j !== i))
  const addRow = () => {
    if (rows.length < 3) a.setScoreRows([...rows, { us: '', them: '' }])
  }
  // La stessa card dei set di «Nuova partita» (design 16), con sotto le
  // risposte: senza punteggio o salva.
  return (
    <>
      <div className="crea-score">
        <SetIntestazione />
        <div className="crea-sets">
          {rows.map((r, i) => (
            <RigaSet
              key={i}
              n={i + 1}
              us={r.us}
              them={r.them}
              onChange={(k, v) => update(i, k, v)}
              onRemove={rows.length > 1 ? () => removeRow(i) : undefined}
            />
          ))}
        </div>
        {rows.length < 3 && (
          <Button variant="glass" size="sm" icon="plus" className="crea-add" onClick={addRow}>Aggiungi set</Button>
        )}
      </div>
      <div className="crea-actions">
        <Button variant="filled" onClick={() => h.submitScore(rows)}>Salva partita</Button>
        <Button variant="glass" onClick={() => h.submitScore([])}>Senza punteggio</Button>
      </div>
    </>
  )
}
