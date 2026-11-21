// ============================================================================
// «Nuova partita» / «Modifica partita» di una tappa del Campionato per Società.
//
// Come il modulo della partita dei tornei (PartitaSheet), con le differenze
// del CIPS:
// - la tappa è già scelta (si apre dal suo dettaglio, o dal ＋ quando la tappa
//   è l'evento più recente) e la riga sotto il titolo la dice;
// - le fasi sono quelle delle formule FIPAV: pool, tabellone vincenti e
//   perdenti della doppia eliminazione, quarti, semifinale, finale, 3° posto,
//   classificazione;
// - le avversarie hanno una società: la propria e quelle già incontrate sono
//   suggerite, perché due coppie della stessa società possono affrontarsi;
// - «Com'è finita»: con un forfait la partita è vinta o persa, ma set e punti
//   non entrano nei numeri;
// - i set sono a 15 o a 21 come la tappa, al massimo tre.
// Le righe dei set sono le stesse dei tornei (RigaSet), senza l'altezza
// animata (l'eccezione E1 di MOTION.md resta dei tornei).
// ============================================================================
import { useEffect, useMemo, useRef, useState } from 'react'
import { Sheet, SheetBar, SheetChips } from './Sheet'
import { RigaSet, SetIntestazione } from './RigaSet'
import { Button } from '../ui/Button'
import { TextArea, TextField } from '../ui/Field'
import { CIPS_ESITI, CIPS_FASI, ESITO, risultato } from '../../lib/campionato'
import type { EsitoCips, FaseCips, PartitaTappaForm } from '../../lib/campionato'
import { LIMITI } from '../../lib/lunghezze'
import type { PartitaTappaSheetProps } from '../../app/contracts'
import './PartitaSheet.css'
import './PartitaTappaSheet.css'

const MAX_SET = 3

interface Riga {
  key: number
  us: string
  them: string
}

let chiavi = 0
const nuovaRiga = (us = '', them = ''): Riga => ({ key: ++chiavi, us, them })

/** «Vinta 2–1», «Persa 0–2», «Vinta a tavolino». */
function esito(righe: Riga[], outcome: EsitoCips): string {
  if (outcome === 'forfait_loro') return 'Vinta a tavolino'
  if (outcome === 'forfait_noi') return 'Persa a tavolino'
  const sets = righe.filter((r) => r.us !== '' && r.them !== '').map((r) => ({ us: Number(r.us), them: Number(r.them) }))
  if (!sets.length) return ''
  const r = risultato({ outcome, sets })
  return `${r.won == null ? 'In parità' : r.won ? 'Vinta' : 'Persa'} ${r.usS}–${r.themS}`
}

export default function PartitaTappaSheet({
  mode,
  match,
  stageId,
  contesto,
  setPoints,
  societa,
  ownClub,
  onSave,
  onDelete,
  onClose,
  top,
  byTouch,
  opener,
  setDirty,
  setBusy,
}: PartitaTappaSheetProps) {
  const modifica = mode === 'modifica'
  const iniziali = useMemo(
    () => ({
      phase: (match?.phase ?? 'Pool') as FaseCips,
      opponents: match?.opponents ?? '',
      opponentsClub: match?.opponentsClub ?? '',
      outcome: (match?.outcome ?? 'giocata') as EsitoCips,
      note: match?.note ?? '',
    }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const righeIniziali = useMemo(
    () => (match && match.sets.length ? match.sets.map((s) => nuovaRiga(String(s.us), String(s.them))) : [nuovaRiga(), nuovaRiga()]),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const [campi, setCampi] = useState(iniziali)
  const [righe, setRighe] = useState<Riga[]>(righeIniziali)
  const [errori, setErrori] = useState<Record<number, string>>({})
  const [occupato, setOccupato] = useState(false)
  const primoNoi = useRef<Record<number, HTMLInputElement | null>>({})
  const daFocalizzare = useRef<number | null>(null)

  const firma = (rr: Riga[], c: typeof campi) => JSON.stringify({ c, s: rr.map((r) => [r.us, r.them]) })
  const sporco = firma(righe, campi) !== firma(righeIniziali, iniziali)
  useEffect(() => {
    setDirty(sporco)
  }, [sporco, setDirty])

  // Il focus va al «Noi» del set nuovo appena è nel DOM.
  useEffect(() => {
    const k = daFocalizzare.current
    if (k == null) return
    daFocalizzare.current = null
    primoNoi.current[k]?.focus({ preventScroll: true })
    primoNoi.current[k]?.scrollIntoView({ block: 'nearest' })
  })

  const aggiungi = () => {
    if (righe.length >= MAX_SET) return
    const r = nuovaRiga()
    daFocalizzare.current = r.key
    setRighe((rr) => [...rr, r])
  }

  const togli = (key: number) => {
    setErrori(({ [key]: _tolto, ...resto }) => resto)
    setRighe((rr) => rr.filter((r) => r.key !== key))
  }

  const aggiorna = (key: number, campo: 'us' | 'them', v: string) => {
    setRighe((rr) => rr.map((r) => (r.key === key ? { ...r, [campo]: v } : r)))
    if (errori[key]) setErrori(({ [key]: _tolto, ...resto }) => resto)
  }

  const salva = async () => {
    if (occupato) return
    // Una riga a metà si segnala, non si scarta.
    const nuovi: Record<number, string> = {}
    righe.forEach((r, i) => {
      if ((r.us === '') !== (r.them === '')) nuovi[r.key] = `Completa il set ${i + 1} o toglilo`
    })
    if (Object.keys(nuovi).length) {
      setErrori(nuovi)
      const primo = righe.find((r) => nuovi[r.key])
      if (primo) primoNoi.current[primo.key]?.focus()
      return
    }
    const form: PartitaTappaForm = {
      stageId,
      phase: campi.phase,
      opponents: campi.opponents,
      opponentsClub: campi.opponentsClub,
      outcome: campi.outcome,
      note: campi.note,
      sets: righe.map((r) => ({ us: r.us, them: r.them })),
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

  const risultatoTesto = esito(righe, campi.outcome)
  const suggerite = societa.filter((s) => s.toLowerCase() !== campi.opponentsClub.trim().toLowerCase()).slice(0, 4)

  return (
    <Sheet
      onClose={onClose}
      top={top}
      byTouch={byTouch}
      opener={opener}
      dirty={sporco}
      busy={occupato}
      header={
        <SheetBar
          title={modifica ? 'Modifica partita' : 'Nuova partita'}
          sub={contesto}
          onCancel={onClose}
          cancelBusy={occupato}
          action={
            <Button variant="filled" busy={occupato} busyLabel="Salvataggio…" onClick={() => void salva()}>
              Salva
            </Button>
          }
        />
      }
    >
      <form
        className="partita-sheet-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void salva()
        }}
      >
        <fieldset className="ui-sheet-stack partita-sheet-fields" disabled={occupato}>
          <SheetChips
            label="Fase"
            options={CIPS_FASI.map((p) => ({ value: p, label: p }))}
            value={campi.phase}
            onChange={(v) => v && setCampi((c) => ({ ...c, phase: v as FaseCips }))}
            hint="Vincenti e Perdenti sono i due tabelloni della doppia eliminazione."
          />

          <TextField
            label="Avversari (coppia)"
            value={campi.opponents}
            onChange={(v) => setCampi((c) => ({ ...c, opponents: v }))}
            placeholder="es. Conti / Gallo"
            autoComplete="off"
            maxLength={LIMITI.avversari.max}
          />

          <div className="partita-tappa-societa">
            <TextField
              label="La loro società"
              value={campi.opponentsClub}
              onChange={(v) => setCampi((c) => ({ ...c, opponentsClub: v }))}
              placeholder="es. Riviera Sand Club"
              autoComplete="off"
              maxLength={LIMITI.societa.max}
            />
            {suggerite.length > 0 && (
              <div className="partita-tappa-sugg" role="group" aria-label="Società già incontrate">
                {suggerite.map((s) => (
                  <button key={s} type="button" className="partita-tappa-chip" onClick={() => setCampi((c) => ({ ...c, opponentsClub: s }))}>
                    {s}
                    {s === ownClub && <span className="partita-tappa-tua"> · la tua</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="ui-field">
            <div className="partita-sheet-score-head">
              <span className="ui-field-label">Punteggio per set · a {setPoints}</span>
              {risultatoTesto && <span className="partita-sheet-esito">{risultatoTesto}</span>}
            </div>
            <div className="partita-sheet-card">
              <SetIntestazione />
              <div className="partita-sheet-sets">
                {righe.map((r, n) => (
                  <div key={r.key} className="partita-sheet-set">
                    <div className="partita-sheet-set-inner">
                      <RigaSet
                        n={n + 1}
                        us={r.us}
                        them={r.them}
                        onChange={(campo, v) => aggiorna(r.key, campo, v)}
                        onRemove={righe.length > 1 ? () => togli(r.key) : undefined}
                        error={errori[r.key]}
                        firstRef={(el) => {
                          primoNoi.current[r.key] = el
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {righe.length < MAX_SET && (
                <Button variant="glass" size="sm" icon="plus" className="partita-sheet-add" onClick={aggiungi}>
                  Aggiungi set
                </Button>
              )}
            </div>
          </div>

          <SheetChips
            label="Com'è finita"
            options={CIPS_ESITI.map((e) => ({ value: e, label: ESITO[e] }))}
            value={campi.outcome}
            onChange={(v) => v && setCampi((c) => ({ ...c, outcome: v as EsitoCips }))}
            hint={campi.outcome === 'giocata' ? undefined : 'Con un forfait (ritiro o assenza) la partita conta come vinta o persa, ma i suoi set e i suoi punti restano fuori dai numeri.'}
          />

          <TextArea
            label="Note"
            className="partita-sheet-note"
            value={campi.note}
            onChange={(v) => setCampi((c) => ({ ...c, note: v }))}
            placeholder="Com'è andata?"
            rows={2}
            maxLength={500}
          />
        </fieldset>

        {modifica && onDelete && (
          <Button variant="glass" tone="danger" icon="trash" block className="ui-sheet-danger" disabled={occupato} onClick={onDelete}>
            Elimina partita
          </Button>
        )}
      </form>
    </Sheet>
  )
}
