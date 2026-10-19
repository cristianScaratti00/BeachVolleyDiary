// ============================================================================
// L'assistente guidato (UX §5 F11, §6.10; MOTION.md §5 F11): la creazione del
// torneo come conversazione. È un percorso FACOLTATIVO (risposta 6): ci si
// arriva dallo sheet «Nuovo torneo», dagli stati vuoti e da `/crea`.
//
// Il copione sta in `crea/copione.ts`, lo stato in `crea/useAssistente.ts`;
// qui la vista. Le correzioni obbligatorie di UX F11: ogni scelta è un
// `<button>`, dopo ogni domanda il focus va al primo controllo del dock, i
// campi hanno un nome (la domanda), il pulsante d'invio si chiama «Invia».
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, FormEvent, ReactNode } from 'react'
import { useReducedMotion } from 'motion/react'
import { BRACKETS, CATEGORIES, FORMATS, PHASES, SURFACES } from '../lib/db.enums'
import type { Option, Placement } from '../lib/models'
import type { CreaChatProps } from '../app/contracts'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import type { IconName } from '../components/ui/Icon'
import { SetRow } from '../components/ui/Field'
import { focusables } from '../components/ui/overlay'
import { FINISHED_PLACEMENTS, fmtSets, righeRiepilogo, shiftISO, todayISO } from './crea/copione'
import type { Draft, Step } from './crea/copione'
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
  const logRef = useRef<HTMLDivElement>(null)
  const dockRef = useRef<HTMLDivElement>(null)
  const vicino = useRef(true)
  const altezza = useAltezzaVisibile()

  // Il tasto indietro equivale a ✕ Esci, con la stessa conferma (UX F11.6).
  const isDirty = useRef(a.isDirty)
  isDirty.current = a.isDirty
  useEffect(() => {
    const off = registerExitGuard?.(() => isDirty.current()) as unknown
    return () => {
      if (typeof off === 'function') (off as () => void)()
    }
  }, [registerExitGuard])

  // Dopo ogni domanda il focus va al primo controllo del dock, quando la bolla
  // è già nel DOM (non a fine animazione).
  useEffect(() => {
    const dock = dockRef.current
    if (!dock) return
    // Il campo di testo, se c'è; altrimenti il primo pulsante (UX F11.2).
    const campo = dock.querySelector<HTMLElement>('input:not([type="date"])')
    ;(campo ?? focusables(dock)[0])?.focus({ preventScroll: true })
  }, [a.focusTick])

  // In fondo alla trascrizione solo se l'utente era già lì: chi sta rileggendo
  // più su non viene strappato via.
  useEffect(() => {
    const el = logRef.current
    if (!el || !vicino.current) return
    // jsdom (e qualche browser incorporato) non ha `scrollTo` sugli elementi.
    if (typeof el.scrollTo === 'function') el.scrollTo({ top: el.scrollHeight, behavior: ridotto ? 'auto' : 'smooth' })
    else el.scrollTop = el.scrollHeight
  }, [a.messages, a.typing, a.step, ridotto])

  const conDock = a.step !== 'saving' && a.step !== 'boot'

  return (
    <div className="crea" style={altezza ? { height: altezza } : undefined}>
      <header className="crea-head">
        <Button variant="quiet" icon="close" onClick={() => onExit(a.isDirty())}>
          Esci
        </Button>
        <div className="crea-title">
          <span className="crea-avatar" aria-hidden="true">
            <Icon name="ball" size={20} />
          </span>
          <div className="crea-title-text">
            <h1 tabIndex={-1}>Assistente torneo</h1>
            <p>Creazione guidata</p>
          </div>
        </div>
      </header>

      <div
        ref={logRef}
        className="crea-log ui-scroll"
        role="log"
        aria-live="polite"
        aria-label="Conversazione con l’assistente"
        onScroll={(e) => {
          const el = e.currentTarget
          vicino.current = el.scrollHeight - el.scrollTop - el.clientHeight <= VICINO_AL_FONDO
        }}
      >
        {a.messages.map((m) => (
          <Bubble key={m.id} m={m} partners={partners} venues={venues} />
        ))}
        {a.typing && <Typing />}
      </div>

      {conDock && (
        <div
          ref={dockRef}
          className="crea-dock"
          // Mentre l'assistente "scrive" il dock resta montato (smontarlo faceva
          // cadere il focus sul body) e attenuato; qualunque input lo sveglia.
          data-attesa={a.typing ? '' : undefined}
          aria-busy={a.typing || undefined}
          onPointerDownCapture={a.interrompi}
          onKeyDownCapture={a.interrompi}
        >
          <Dock a={a} partners={partners} venues={venues} onDone={onDone} />
        </div>
      )}
    </div>
  )
}

// =============================================================== trascrizione

function Bubble({ m, partners, venues }: { m: Msg; partners: Option[]; venues: Option[] }) {
  const ai = m.role === 'ai'
  return (
    <div className="crea-msg" data-role={m.role}>
      {ai && (
        <span className="crea-avatar" data-size="s" aria-hidden="true">
          <Icon name="ball" size={16} />
        </span>
      )}
      <div className="crea-bubble">
        {!ai && <span className="sr-only">Tu: </span>}
        {m.recap ? <Recap d={m.recap} partners={partners} venues={venues} /> : m.text}
      </div>
    </div>
  )
}

/** L'unico indicatore "sta scrivendo" (UX §6.10): la bolla nella trascrizione. */
function Typing() {
  return (
    <div className="crea-msg" data-role="ai">
      <span className="crea-avatar" data-size="s" aria-hidden="true">
        <Icon name="ball" size={16} />
      </span>
      <div className="crea-bubble crea-typing">
        <span className="crea-dots" aria-hidden="true">
          <span style={{ '--i': 0 } as CSSProperties} />
          <span style={{ '--i': 1 } as CSSProperties} />
          <span style={{ '--i': 2 } as CSSProperties} />
        </span>
        <span className="sr-only">L’assistente sta scrivendo</span>
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

// =============================================================== il dock

function Dock({ a, partners, venues, onDone }: { a: Assistente; partners: Option[]; venues: Option[]; onDone: (id: string) => void }) {
  const h = a.handlers
  const q = a.domandaCorrente ?? ''
  const step: Step = a.step

  switch (step) {
    case 'name':
      return <TextDock a={a} label={q} placeholder="es. Summer Cup Rimini" onSubmit={() => h.submitName(a.text)} />

    case 'partner':
      // Senza compagni salvati una lista non ha senso: si chiede il nome (o "Da solo").
      if (!partners.length)
        return (
          <TextDock
            a={a}
            label={q}
            placeholder="es. Giulia"
            skip={{ label: 'Ho giocato da solo', onClick: h.pickNoPartner }}
            onSubmit={() => h.submitPartnerName(a.text, false)}
          />
        )
      return (
        <Chips label={q}>
          {partners.map((p) => (
            <Chip key={p.id} onClick={() => h.pickPartner(p)}>{p.name}</Chip>
          ))}
          <Chip tone="accent" icon="plus" onClick={h.chooseNewPartner}>Nuovo compagno</Chip>
          <Chip onClick={h.pickNoPartner}>Da solo</Chip>
        </Chips>
      )

    case 'partnerName':
      return <TextDock a={a} label={q} placeholder="es. Giulia" onSubmit={() => h.submitPartnerName(a.text, false)} />
    case 'resultsPartnerName':
      return <TextDock a={a} label={q} placeholder="es. Giulia" onSubmit={() => h.submitPartnerName(a.text, true)} />

    case 'resultsPartner':
      return (
        <Chips label={q}>
          {partners.map((p) => (
            <Chip key={p.id} onClick={() => h.pickResultsPartner(p)}>{p.name}</Chip>
          ))}
        </Chips>
      )

    case 'date':
      return (
        <div className="crea-stack">
          <Chips label={q}>
            <Chip tone="accent" onClick={() => h.pickDate(todayISO(), 'Oggi')}>Oggi</Chip>
            <Chip onClick={() => h.pickDate(shiftISO(-1), 'Ieri')}>Ieri</Chip>
            <Chip onClick={() => h.pickDate(shiftISO(-7), 'La scorsa settimana')}>Settimana scorsa</Chip>
          </Chips>
          <form
            className="crea-form"
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              h.pickDateValue()
            }}
          >
            <label className="sr-only" htmlFor="crea-data">Un altro giorno</label>
            <input id="crea-data" type="date" className="ui-input" value={a.dateVal} onChange={(e) => a.setDateVal(e.target.value)} />
            <Button type="submit" variant="neutral">Usa questa data</Button>
          </form>
        </div>
      )

    case 'venue':
      if (!venues.length)
        return (
          <TextDock
            a={a}
            label={q}
            placeholder="es. Bagno 26 Riccione"
            skip={{ label: 'Salta', onClick: h.skipVenue }}
            onSubmit={() => h.submitVenueName(a.text)}
          />
        )
      return (
        <Chips label={q}>
          {venues.map((v) => (
            <Chip key={v.id} onClick={() => h.pickVenue(v)}>{v.name}</Chip>
          ))}
          <Chip tone="accent" icon="pin" onClick={h.chooseNewVenue}>Nuovo luogo</Chip>
          <Chip onClick={h.skipVenue}>Salta</Chip>
        </Chips>
      )

    case 'venueName':
      return <TextDock a={a} label={q} placeholder="es. Bagno 26 Riccione" onSubmit={() => h.submitVenueName(a.text)} />

    case 'category':
      return (
        <Chips label={q}>
          {CATEGORIES.map((c) => (
            <Chip key={c} onClick={() => h.pickCategory(c)}>{c}</Chip>
          ))}
        </Chips>
      )

    case 'format':
      return (
        <Chips label={q}>
          {FORMATS.map((f) => (
            <Chip key={f} onClick={() => h.pickFormat(f)}>{f}</Chip>
          ))}
        </Chips>
      )

    case 'surface':
      return (
        <Chips label={q}>
          {SURFACES.map((s) => (
            <Chip key={s} onClick={() => h.pickSurface(s)}>{s}</Chip>
          ))}
        </Chips>
      )

    case 'status':
      return (
        <Chips label={q}>
          <Chip tone="accent" onClick={() => h.pickStatus('finished')}>È finito</Chip>
          <Chip onClick={() => h.pickStatus('ongoing')}>È ancora in corso</Chip>
        </Chips>
      )

    case 'placement':
      return (
        <Chips label={q}>
          {FINISHED_PLACEMENTS.map((p) => (
            <Chip key={p} onClick={() => h.pickPlacement(p)}>
              <Piazzamento p={p} />
            </Chip>
          ))}
        </Chips>
      )

    case 'bracket':
      return (
        <Chips label={q}>
          {BRACKETS.map((b) => (
            <Chip key={b} onClick={() => h.pickBracket(b)}>{b}</Chip>
          ))}
          <Chip onClick={() => h.pickBracket('')}>Nessun tabellone</Chip>
        </Chips>
      )

    case 'askResults':
      return (
        <Chips label={q}>
          <Chip tone="accent" onClick={() => h.answerResults(true)}>Sì, aggiungiamole</Chip>
          <Chip onClick={() => h.answerResults(false)}>No, va bene così</Chip>
        </Chips>
      )

    case 'matchOpponents':
      return (
        <TextDock
          a={a}
          label={q}
          placeholder="es. Bianchi / Verdi"
          skip={{ label: 'Senza nome', onClick: () => h.submitOpponents('') }}
          onSubmit={() => h.submitOpponents(a.text)}
          submitEmpty
        />
      )

    case 'matchPhase':
      return (
        <Chips label={q}>
          {PHASES.map((ph) => (
            <Chip key={ph} onClick={() => h.pickPhase(ph)}>{ph}</Chip>
          ))}
        </Chips>
      )

    case 'matchScore':
      return <ScoreDock a={a} />

    case 'matchMore':
      return (
        <Chips label={q}>
          <Chip tone="accent" icon="plus" onClick={() => h.answerMore(true)}>Aggiungi partita</Chip>
          <Chip onClick={() => h.answerMore(false)}>Ho finito</Chip>
        </Chips>
      )

    case 'recap':
      return (
        <div className="crea-actions" role="group" aria-label={q}>
          <Button variant="filled" onClick={() => void h.confirmCreate()}>Crea torneo</Button>
          <Button variant="plain" onClick={h.restart}>Ricomincia</Button>
        </div>
      )

    case 'done':
      return (
        <div className="crea-actions">
          <Button variant="filled" block onClick={() => a.createdId && onDone(a.createdId)}>Apri il torneo</Button>
          <Button variant="tinted" block onClick={h.restart}>Crea un altro</Button>
        </div>
      )

    default:
      return null
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

function Chips({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="crea-chips" role="group" aria-label={label}>
      {children}
    </div>
  )
}

function Chip({ children, onClick, tone, icon }: { children: ReactNode; onClick: () => void; tone?: 'accent'; icon?: IconName }) {
  return (
    <button type="button" className="crea-chip" data-tone={tone} onClick={onClick}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  )
}

function TextDock({ a, label, placeholder, onSubmit, skip, submitEmpty = false }: {
  a: Assistente
  /** Il nome del campo: la domanda (UX F11.3). */
  label: string
  placeholder: string
  onSubmit: () => void
  skip?: { label: string; onClick: () => void }
  /** Il campo vuoto si può inviare (gli avversari diventano «Avversari»). */
  submitEmpty?: boolean
}) {
  const vuoto = !a.text.trim()
  return (
    <div className="crea-stack">
      {skip && (
        <Chips label="Alternative">
          <Chip onClick={skip.onClick}>{skip.label}</Chip>
        </Chips>
      )}
      <form
        className="crea-form"
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          if (vuoto && !submitEmpty) return
          onSubmit()
        }}
      >
        <input
          className="ui-input crea-input"
          value={a.text}
          onChange={(e) => a.setText(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
          autoComplete="off"
          enterKeyHint="send"
        />
        <button
          type="submit"
          className="ui-icon-button crea-send"
          data-variant="filled"
          aria-label="Invia"
          aria-disabled={vuoto && !submitEmpty ? true : undefined}
        >
          <Icon name="send" size={20} />
        </button>
      </form>
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
  return (
    <div className="crea-stack">
      <div className="crea-sets">
        {rows.map((r, i) => (
          <SetRow
            key={i}
            index={i}
            us={r.us}
            them={r.them}
            onChange={(k, v) => update(i, k, v)}
            onRemove={rows.length > 1 ? () => removeRow(i) : undefined}
          />
        ))}
      </div>
      <div className="crea-actions" data-wrap="">
        {rows.length < 3 && (
          <Chip icon="plus" onClick={addRow}>Aggiungi set</Chip>
        )}
        <span className="crea-spacer" />
        <Chip onClick={() => h.submitScore([])}>Senza punteggio</Chip>
        <Button variant="filled" onClick={() => h.submitScore(rows)}>Salva partita</Button>
      </div>
    </div>
  )
}
