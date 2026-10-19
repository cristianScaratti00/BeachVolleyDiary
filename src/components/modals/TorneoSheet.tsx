// ============================================================================
// «Nuovo torneo» / «Modifica torneo» (UX §5 F2): UN solo sheet al posto del
// form completo, della creazione rapida e dei loro tre ingressi.
//
// - Gli essenziali stanno in cima: Nome* · Data · Dove hai giocato · Con chi ·
//   Com'è andata. Si salva con il solo nome.
// - «Altri dettagli» è chiuso in creazione (con il riassunto dei valori
//   correnti) e aperto in modifica, dove di solito si cerca proprio un
//   dettaglio. È l'unica altezza animata dell'app (MOTION.md E1).
// - L'analytics distingue `rapido` (dettagli mai aperti) da `completo` (UX §13).
// - «Crea torneo» è annunciato disattivo finché il Nome è vuoto, ma il tocco
//   porta al campo e dice cosa manca (MOTION.md M15). Occupato: «Creo…», campi
//   bloccati, il doppio tocco non fa niente.
// - Sul vetro dello sheet i campi stanno su gruppi opachi (ART_DIRECTION D6);
//   «Elimina torneo» è una riga opaca, mai testo --danger sul vetro.
// ============================================================================
import { useEffect, useMemo, useRef, useState } from 'react'
import { Sheet, SheetActions, SheetTitle } from './Sheet'
import VenuePicker from './VenuePicker'
import { Button } from '../ui/Button'
import { Disclosure, FormGroup, Select, SwatchPicker, TextField } from '../ui/Field'
import { SegmentedControl } from '../ui/Choice'
import { List, ListRow } from '../ui/List'
import { placementText } from '../ui/Badge'
import { BRACKETS, CATEGORIES, FORMATS, PLACEMENTS, SURFACES } from '../../lib/db.enums'
import { SWATCH_COLORS } from '../../lib/theme'
import type { AnyForm, Bracket, Category, Format, Placement, SetField, Surface } from '../../lib/models'
import type { TorneoSheetProps } from '../../app/contracts'
import './TorneoSheet.css'

const NOME_MANCANTE = 'Scrivi il nome del torneo.'

function formIniziale({ torneo, compagnoDefault, today }: Pick<TorneoSheetProps, 'torneo' | 'compagnoDefault' | 'today'>): AnyForm {
  if (torneo) {
    return {
      name: torneo.name,
      date: torneo.date,
      city: torneo.city,
      venueId: torneo.venueId ?? '',
      newVenueName: '',
      newVenueCity: '',
      newVenueCoords: '',
      category: torneo.category,
      format: torneo.format,
      surface: torneo.surface,
      placement: torneo.placement,
      bracket: torneo.bracket ?? '',
      color: torneo.color,
      emoji: torneo.emoji,
      partnerId: torneo.partnerId ?? '',
      newPartnerName: '',
    }
  }
  return {
    name: '',
    // "Oggi" è la stessa funzione del resto dell'app (Q20): il confine
    // prossimi/passati e il default del form non si contraddicono.
    date: today,
    city: '',
    venueId: '',
    newVenueName: '',
    newVenueCity: '',
    newVenueCoords: '',
    category: 'Amatoriale',
    format: '2vs2',
    surface: 'Sabbia outdoor',
    placement: 'In corso',
    bracket: '',
    color: SWATCH_COLORS[0],
    emoji: '🏖️',
    partnerId: compagnoDefault,
    newPartnerName: '',
  }
}

export default function TorneoSheet({
  mode,
  torneo,
  partners,
  venues,
  compagnoDefault,
  today,
  canAddPartner,
  onSave,
  onDelete,
  onUseAssistant,
  onMergeVenues,
  onClose,
  top,
  byTouch,
  opener,
  setDirty,
  setBusy,
}: TorneoSheetProps) {
  const modifica = mode === 'modifica'
  // Il valore iniziale si fissa all'apertura: è il riferimento del "sporco".
  const iniziale = useMemo(() => formIniziale({ torneo, compagnoDefault, today }), [])  // eslint-disable-line react-hooks/exhaustive-deps
  const [form, setForm] = useState<AnyForm>(iniziale)
  const [dettagli, setDettagli] = useState(modifica)
  const dettagliAperti = useRef(modifica)
  const [occupato, setOccupato] = useState(false)
  const [errNome, setErrNome] = useState('')
  const nomeRef = useRef<HTMLInputElement>(null)

  const setField: SetField = (k, v) => {
    if (k === 'name' && errNome) setErrNome('')
    setForm((f) => ({ ...f, [k]: v }))
  }

  const sporco = JSON.stringify(form) !== JSON.stringify(iniziale)
  useEffect(() => {
    setDirty(sporco)
  }, [sporco, setDirty])

  const nomeVuoto = !(form.name ?? '').trim()

  const manca = () => {
    setErrNome(NOME_MANCANTE)
    nomeRef.current?.focus()
    nomeRef.current?.scrollIntoView({ block: 'center' })
  }

  const salva = async () => {
    if (occupato) return
    if (nomeVuoto) {
      manca()
      return
    }
    setOccupato(true)
    setBusy(true)
    try {
      await onSave({ ...form, name: (form.name ?? '').trim() }, dettagliAperti.current ? 'completo' : 'rapido')
    } finally {
      setOccupato(false)
      setBusy(false)
    }
  }

  const riassunto = [form.category, form.format, form.surface].filter(Boolean).join(' · ')
  const nuovoCompagno = form.partnerId === 'new'

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
            disabled={nomeVuoto}
            onDisabledClick={manca}
            busy={occupato}
            busyLabel={modifica ? 'Salvataggio…' : 'Creo…'}
            onClick={() => void salva()}
          >
            {modifica ? 'Salva' : 'Crea torneo'}
          </Button>
        </SheetActions>
      }
    >
      <SheetTitle>{modifica ? 'Modifica torneo' : 'Nuovo torneo'}</SheetTitle>
      <form
        className="torneo-sheet-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void salva()
        }}
      >
        {/* Durante il salvataggio i campi sono bloccati (UX §5 F2). */}
        <fieldset className="torneo-sheet-fields" disabled={occupato}>
          <FormGroup>
            <TextField
              ref={nomeRef}
              label="Nome torneo"
              value={form.name ?? ''}
              onChange={(v) => setField('name', v)}
              placeholder="es. Summer Cup Rimini"
              autoComplete="off"
              enterKeyHint="done"
              required
              aria-required="true"
              error={errNome || undefined}
            />
            <TextField label="Data" type="date" value={form.date ?? ''} onChange={(v) => setField('date', v)} />
            <VenuePicker form={form} setField={setField} venues={venues} suggestSurface onMerge={onMergeVenues} />
            <div className="torneo-sheet-partner">
              <Select
                label="Con chi"
                value={form.partnerId ?? ''}
                onChange={(v) => setField('partnerId', v)}
                options={[
                  { value: '', label: 'Nessuno' },
                  ...partners.map((p) => ({ value: p.id, label: p.name })),
                  ...(canAddPartner || nuovoCompagno ? [{ value: 'new', label: '＋ Nuovo compagno…' }] : []),
                ]}
                hint={modifica ? 'Cambiandolo, il compagno viene aggiornato su tutte le partite del torneo.' : undefined}
              />
              {nuovoCompagno && (
                <TextField
                  label="Nome del nuovo compagno"
                  value={form.newPartnerName ?? ''}
                  onChange={(v) => setField('newPartnerName', v)}
                  placeholder="es. Giulia"
                  autoComplete="off"
                />
              )}
            </div>
            <Select
              label="Com'è andata"
              value={form.placement ?? 'In corso'}
              onChange={(v) => setField('placement', v as Placement)}
              // Il valore resta quello del DB («1° 🏆», C15): cambia solo come si legge.
              options={PLACEMENTS.map((p) => ({ value: p, label: placementText(p) }))}
            />
          </FormGroup>

          <Disclosure
            title="Altri dettagli"
            summary={riassunto}
            open={dettagli}
            onToggle={() => {
              if (!dettagli) dettagliAperti.current = true
              setDettagli(!dettagli)
            }}
            className="torneo-sheet-details"
          >
            <FormGroup className="torneo-sheet-more">
              <Select
                label="Categoria"
                value={form.category ?? 'Amatoriale'}
                onChange={(v) => setField('category', v as Category)}
                options={CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
              <div className="ui-field">
                <span className="ui-field-label" aria-hidden="true">Formato</span>
                <SegmentedControl
                  label="Formato"
                  value={form.format ?? '2vs2'}
                  onChange={(v) => setField('format', v as Format)}
                  options={FORMATS.map((f) => ({ value: f, label: f }))}
                />
              </div>
              <Select
                label="Superficie"
                value={form.surface ?? 'Sabbia outdoor'}
                onChange={(v) => setField('surface', v as Surface)}
                options={SURFACES.map((s) => ({ value: s, label: s }))}
              />
              {/* Il tabellone affianca il piazzamento: «2°» da solo non dice
                  se era il Gold o il Silver. Facoltativo. */}
              <Select
                label="Tabellone"
                value={form.bracket ?? ''}
                onChange={(v) => setField('bracket', v as Bracket | '')}
                options={[{ value: '', label: 'Nessuno' }, ...BRACKETS.map((b) => ({ value: b, label: b }))]}
              />
              <SwatchPicker
                label="Etichetta colore"
                colors={SWATCH_COLORS}
                value={form.color ?? SWATCH_COLORS[0]}
                onChange={(c) => setField('color', c)}
              />
            </FormGroup>
          </Disclosure>
        </fieldset>

        {!modifica && (
          <Button variant="plain" icon="chat" className="torneo-sheet-assistant" onClick={() => onUseAssistant(sporco)}>
            Preferisci farti guidare? Usa l'assistente →
          </Button>
        )}

        {modifica && onDelete && (
          <List className="torneo-sheet-danger">
            <ListRow onClick={onDelete} icon="trash" title="Elimina torneo" tone="danger" disabled={occupato} />
          </List>
        )}
      </form>
    </Sheet>
  )
}
