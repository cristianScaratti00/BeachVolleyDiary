// ============================================================================
// «Nuova partita» / «Modifica partita» (UX §5 F3).
//
// - Due righe di set vuote di default, al massimo tre. Ogni riga ha «Noi» e
//   «Loro» con un'etichetta vera (prima solo placeholder) e «Togli set N».
// - Una riga compilata a metà NON si scarta in silenzio: al salvataggio la si
//   segnala («Completa il set 2 o toglilo») e il focus ci va.
// - Una riga che arriva o se ne va cresce dentro lo sheet ancorato in basso:
//   è l'eccezione E1 di MOTION.md (`data-motion-exception="riga-set"`), con il
//   focus sul «Noi» del set nuovo a t0.
// - «Elimina partita» (in modifica) è una riga opaca che apre il
//   ConfirmDialog: mai testo --danger sul vetro.
// ============================================================================
import { useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { Sheet, SheetActions, SheetTitle } from './Sheet'
import { Button } from '../ui/Button'
import { FormGroup, Select, SetRow, TextArea, TextField } from '../ui/Field'
import { List, ListRow } from '../ui/List'
import { PHASES } from '../../lib/db.enums'
import type { AnyForm, Phase } from '../../lib/models'
import type { PartitaSheetProps } from '../../app/contracts'
import './PartitaSheet.css'

const MAX_SET = 3

interface Riga {
  key: number
  us: string
  them: string
  /** Appena aggiunta: cresce (E1). */
  entra?: boolean
  /** Tolta: si chiude e poi esce dal DOM. */
  esce?: boolean
}

let chiavi = 0
const nuovaRiga = (us = '', them = ''): Riga => ({ key: ++chiavi, us, them })

/** Le animazioni CSS ci sono davvero (in jsdom no: lì la riga esce subito). */
const animazioniCss = () => typeof document !== 'undefined' && typeof document.documentElement.getAnimations === 'function'
/** Rete di sicurezza: se `animationend` non arriva (scheda in background), la riga esce lo stesso. */
const RETE_MS = 400

export default function PartitaSheet({
  mode,
  match,
  tournamentId,
  tournaments,
  onSave,
  onDelete,
  onClose,
  top,
  byTouch,
  opener,
  setDirty,
  setBusy,
}: PartitaSheetProps) {
  const modifica = mode === 'modifica'
  const ridotto = useReducedMotion()

  const inizialeBase = useMemo(
    () => ({
      tournamentId: match?.tournamentId ?? tournamentId ?? tournaments[0]?.id ?? '',
      phase: (match?.phase ?? 'Girone') as Phase,
      opponents: match?.opponents ?? '',
      note: match?.note ?? '',
    }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const righeIniziali = useMemo(
    () => (match && match.sets.length ? match.sets.map((s) => nuovaRiga(String(s.us), String(s.them))) : [nuovaRiga(), nuovaRiga()]),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const [campi, setCampi] = useState(inizialeBase)
  const [righe, setRighe] = useState<Riga[]>(righeIniziali)
  const [errori, setErrori] = useState<Record<number, string>>({})
  const [occupato, setOccupato] = useState(false)
  // «Salva» disattivo senza torneo: il tocco dice perché e porta al campo.
  const [senzaTorneo, setSenzaTorneo] = useState(false)
  const torneoRef = useRef<HTMLSelectElement>(null)
  const primoNoi = useRef<Record<number, HTMLInputElement | null>>({})
  const daFocalizzare = useRef<number | null>(null)

  const visibili = righe.filter((r) => !r.esce)
  const firma = (rr: Riga[], c: typeof campi) =>
    JSON.stringify({ c, s: rr.filter((r) => !r.esce).map((r) => [r.us, r.them]) })
  const sporco = firma(righe, campi) !== firma(righeIniziali, inizialeBase)
  useEffect(() => {
    setDirty(sporco)
  }, [sporco, setDirty])

  // Il focus va al «Noi» del set nuovo quando la riga è nel DOM (t0).
  useEffect(() => {
    const k = daFocalizzare.current
    if (k == null) return
    daFocalizzare.current = null
    primoNoi.current[k]?.focus({ preventScroll: true })
    primoNoi.current[k]?.scrollIntoView({ block: 'nearest', behavior: ridotto ? 'auto' : 'smooth' })
  })

  const aggiungi = () => {
    if (visibili.length >= MAX_SET) return
    const r = { ...nuovaRiga(), entra: !ridotto && animazioniCss() }
    daFocalizzare.current = r.key
    setRighe((rr) => [...rr, r])
  }

  const togli = (key: number) => {
    setErrori((e) => {
      const { [key]: _tolto, ...resto } = e
      return resto
    })
    // Con reduced-motion la riga se ne va subito; altrimenti si chiude (E1) e
    // a fine animazione esce dal DOM.
    const via = () => setRighe((rr) => rr.filter((r) => r.key !== key))
    if (ridotto || !animazioniCss()) {
      via()
      return
    }
    setRighe((rr) => rr.map((r) => (r.key === key ? { ...r, esce: true } : r)))
    window.setTimeout(via, RETE_MS)
  }

  const aggiorna = (key: number, campo: 'us' | 'them', v: string) => {
    setRighe((rr) => rr.map((r) => (r.key === key ? { ...r, [campo]: v } : r)))
    if (errori[key]) {
      setErrori((e) => {
        const { [key]: _tolto, ...resto } = e
        return resto
      })
    }
  }

  const salva = async () => {
    if (occupato) return
    // Una riga a metà si segnala, non si scarta.
    const nuoviErrori: Record<number, string> = {}
    visibili.forEach((r, i) => {
      const meta = (r.us === '') !== (r.them === '')
      if (meta) nuoviErrori[r.key] = `Completa il set ${i + 1} o toglilo`
    })
    if (Object.keys(nuoviErrori).length) {
      setErrori(nuoviErrori)
      const primo = visibili.find((r) => nuoviErrori[r.key])
      if (primo) {
        primoNoi.current[primo.key]?.focus()
        primoNoi.current[primo.key]?.scrollIntoView({ block: 'center', behavior: ridotto ? 'auto' : 'smooth' })
      }
      return
    }
    const form: AnyForm = {
      tournamentId: campi.tournamentId,
      phase: campi.phase,
      opponents: campi.opponents,
      note: campi.note,
      sets: visibili.map((r) => ({ us: r.us, them: r.them })),
    }
    setOccupato(true)
    setBusy(true)
    try {
      await onSave(form)
    } finally {
      setOccupato(false)
      setBusy(false)
    }
  }

  return (
    <Sheet
      onClose={onClose}
      top={top}
      byTouch={byTouch}
      opener={opener}
      dirty={sporco}
      busy={occupato}
      footer={
        <SheetActions>
          <Button variant="quiet" onClick={onClose} aria-disabled={occupato || undefined}>
            Annulla
          </Button>
          <Button
            variant="filled"
            disabled={!campi.tournamentId}
            onDisabledClick={() => {
              setSenzaTorneo(true)
              torneoRef.current?.focus()
            }}
            busy={occupato}
            busyLabel="Salvataggio…"
            onClick={() => void salva()}
          >
            {modifica ? 'Salva' : 'Salva partita'}
          </Button>
        </SheetActions>
      }
    >
      <SheetTitle>{modifica ? 'Modifica partita' : 'Nuova partita'}</SheetTitle>
      <form
        className="partita-sheet-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void salva()
        }}
      >
        <fieldset className="partita-sheet-fields" disabled={occupato}>
          <FormGroup>
            <Select
              ref={torneoRef}
              label="Torneo"
              value={campi.tournamentId}
              onChange={(v) => {
                setSenzaTorneo(false)
                setCampi((c) => ({ ...c, tournamentId: v }))
              }}
              options={tournaments.map((t) => ({ value: t.id, label: t.name }))}
              error={senzaTorneo && !campi.tournamentId ? (tournaments.length ? 'Scegli il torneo della partita.' : 'Crea prima un torneo: la partita sta dentro un torneo.') : undefined}
            />
            <Select
              label="Fase"
              value={campi.phase}
              onChange={(v) => setCampi((c) => ({ ...c, phase: v as Phase }))}
              options={PHASES.map((p) => ({ value: p, label: p }))}
              hint="Il compagno è quello del torneo."
            />
            <TextField
              label="Avversari"
              value={campi.opponents}
              onChange={(v) => setCampi((c) => ({ ...c, opponents: v }))}
              placeholder="es. Bianchi / Verdi (facoltativo)"
              autoComplete="off"
            />
          </FormGroup>

          <FormGroup title="Punteggio per set">
            <div className="partita-sheet-sets">
              {righe.map((r) => {
                const n = visibili.indexOf(r)
                return (
                  <div
                    key={r.key}
                    className="partita-sheet-set"
                    data-motion-exception="riga-set"
                    data-entra={r.entra ? '' : undefined}
                    data-esce={r.esce ? '' : undefined}
                    onAnimationEnd={(e) => {
                      if (e.target !== e.currentTarget) return
                      if (r.esce) setRighe((rr) => rr.filter((x) => x.key !== r.key))
                      else if (r.entra) setRighe((rr) => rr.map((x) => (x.key === r.key ? { ...x, entra: false } : x)))
                    }}
                  >
                    <div className="partita-sheet-set-inner" {...(r.esce ? { inert: '' } : {})}>
                      <SetRow
                        index={n < 0 ? 0 : n}
                        us={r.us}
                        them={r.them}
                        onChange={(campo, v) => aggiorna(r.key, campo, v)}
                        onRemove={visibili.length > 1 ? () => togli(r.key) : undefined}
                        error={errori[r.key]}
                        firstRef={(el) => {
                          primoNoi.current[r.key] = el
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            {visibili.length < MAX_SET && (
              <Button variant="tinted" size="sm" icon="plus" className="partita-sheet-add" onClick={aggiungi}>
                Aggiungi set
              </Button>
            )}
          </FormGroup>

          <FormGroup>
            <TextArea
              label="Note"
              value={campi.note}
              onChange={(v) => setCampi((c) => ({ ...c, note: v }))}
              placeholder="Com'è andata?"
            />
          </FormGroup>
        </fieldset>

        {modifica && onDelete && (
          <List className="partita-sheet-danger">
            <ListRow onClick={onDelete} icon="trash" title="Elimina partita" tone="danger" disabled={occupato} />
          </List>
        )}
      </form>
    </Sheet>
  )
}
