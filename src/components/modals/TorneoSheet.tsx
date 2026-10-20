// ============================================================================
// «Nuovo torneo» / «Torneo rapido» / «Modifica torneo» (UX §5 F2, design 15):
// UN solo sheet per i tre ingressi.
//
// - In cima la barra «Annulla · titolo · Salva»: le azioni restano in vista
//   anche con la tastiera su.
// - «Torneo» (e la modifica) mostra tutto il modulo del design: Nome · Con
//   chi · Data e Luogo · Categoria · Formato e Superficie · Piazzamento ·
//   Tabellone. Le scelte brevi sono chip che vanno a capo (`aria-pressed`).
// - «Torneo rapido» tiene in vista solo Nome, Data e Piazzamento; il resto
//   sta in «Altri dettagli» (chiuso, con il riassunto). È l'unica altezza
//   animata dell'app (MOTION.md E1).
// - L'analytics distingue `rapido` (rapido senza mai aprire i dettagli) da
//   `completo` (UX §13).
// - «Salva» è annunciato disattivo finché il Nome è vuoto, ma il tocco porta
//   al campo e dice cosa manca (MOTION.md M15). Occupato: «Creo…», campi
//   bloccati, il doppio tocco non fa niente.
// ============================================================================
import { useEffect, useMemo, useRef, useState } from 'react'
import { Sheet, SheetBar, SheetChipAdd, SheetChips } from './Sheet'
import VenuePicker from './VenuePicker'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Disclosure, SwatchPicker, TextField } from '../ui/Field'
import { placementText } from '../ui/Badge'
import { BRACKETS, CATEGORIES, FORMATS, PLACEMENTS, SURFACES } from '../../lib/db.enums'
import { SWATCH_COLORS } from '../../lib/theme'
import type { AnyForm, Bracket, Category, Format, Placement, SetField, Surface } from '../../lib/models'
import type { TorneoSheetProps } from '../../app/contracts'
import './TorneoSheet.css'

const NOME_MANCANTE = 'Scrivi il nome del torneo.'

/** La superficie si legge corta come nel design («Sabbia»); il valore resta quello del DB. */
const SUPERFICIE: Record<Surface, string> = { 'Sabbia outdoor': 'Sabbia', Indoor: 'Indoor', Erba: 'Erba' }

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
  rapido = false,
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
  const breve = rapido && !modifica
  // Il valore iniziale si fissa all'apertura: è il riferimento del "sporco".
  const iniziale = useMemo(() => formIniziale({ torneo, compagnoDefault, today }), [])  // eslint-disable-line react-hooks/exhaustive-deps
  const [form, setForm] = useState<AnyForm>(iniziale)
  const [dettagli, setDettagli] = useState(false)
  // Il modulo intero è «completo» da sé; il rapido lo diventa aprendo i dettagli.
  const dettagliAperti = useRef(!breve)
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

  const nuovoCompagno = form.partnerId === 'new'
  const compagno = nuovoCompagno ? (form.newPartnerName ?? '').trim() : partners.find((p) => p.id === form.partnerId)?.name
  const riassunto = [compagno, form.category, form.format, form.surface].filter(Boolean).join(' · ')
  const titolo = modifica ? 'Modifica torneo' : breve ? 'Torneo rapido' : 'Nuovo torneo'

  // ------------------------------------------------------------- i blocchi
  const nome = (
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
  )

  const data = <TextField label="Data" type="date" value={form.date ?? ''} onChange={(v) => setField('date', v)} />

  const conChi = (
    <div className="torneo-sheet-partner">
      <SheetChips
        label="Con chi lo hai fatto"
        options={partners.map((p) => ({ value: p.id, label: p.name }))}
        value={nuovoCompagno ? '' : form.partnerId ?? ''}
        // Ritoccare il compagno scelto lo toglie: il torneo resta «da solo».
        onChange={(v) => setField('partnerId', v)}
        toggle
        hint={modifica ? 'Cambiandolo, il compagno viene aggiornato su tutte le partite del torneo.' : undefined}
      >
        {(canAddPartner || nuovoCompagno) && (
          <SheetChipAdd pressed={nuovoCompagno} onClick={() => setField('partnerId', nuovoCompagno ? '' : 'new')}>
            <Icon name="plus" size={16} />
            Nuovo compagno
          </SheetChipAdd>
        )}
      </SheetChips>
      {nuovoCompagno && (
        <TextField
          label="Nome del nuovo compagno"
          value={form.newPartnerName ?? ''}
          onChange={(v) => setField('newPartnerName', v)}
          placeholder="es. Giulia"
          autoComplete="off"
          // Scelto «Nuovo compagno», il campo del nome è la cosa da fare.
          autoFocus
        />
      )}
    </div>
  )

  const luogo = <VenuePicker form={form} setField={setField} venues={venues} suggestSurface onMerge={onMergeVenues} />

  const categoria = (
    <SheetChips
      label="Categoria"
      options={CATEGORIES.map((c) => ({ value: c, label: c }))}
      value={form.category ?? 'Amatoriale'}
      onChange={(v) => v && setField('category', v as Category)}
    />
  )

  const formatoSuperficie = (
    <div className="ui-sheet-pair" data-ratio="chips">
      <SheetChips
        label="Formato"
        options={FORMATS.map((f) => ({ value: f, label: f }))}
        value={form.format ?? '2vs2'}
        onChange={(v) => v && setField('format', v as Format)}
      />
      <SheetChips
        label="Superficie"
        options={SURFACES.map((s) => ({ value: s, label: SUPERFICIE[s] }))}
        value={form.surface ?? 'Sabbia outdoor'}
        onChange={(v) => v && setField('surface', v as Surface)}
      />
    </div>
  )

  const piazzamento = (
    <SheetChips
      label="Piazzamento"
      // Il valore resta quello del DB («1° 🏆», C15): cambia solo come si legge.
      options={PLACEMENTS.map((p) => ({ value: p, label: placementText(p) }))}
      value={form.placement ?? 'In corso'}
      onChange={(v) => v && setField('placement', v as Placement)}
    />
  )

  // Il tabellone affianca il piazzamento: «2°» da solo non dice se era il
  // Gold o il Silver. Facoltativo: ritoccarlo lo toglie.
  const tabellone = (
    <SheetChips
      label={<>Tabellone <span className="ui-sheet-optional">(facoltativo)</span></>}
      options={BRACKETS.map((b) => ({ value: b, label: b }))}
      value={form.bracket ?? ''}
      onChange={(v) => setField('bracket', v as Bracket | '')}
      toggle
    />
  )

  const colore = (
    <SwatchPicker
      label="Etichetta colore"
      colors={SWATCH_COLORS}
      value={form.color ?? SWATCH_COLORS[0]}
      onChange={(c) => setField('color', c)}
    />
  )

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
          title={titolo}
          onCancel={onClose}
          cancelBusy={occupato}
          action={
            <Button
              variant="filled"
              disabled={nomeVuoto}
              onDisabledClick={manca}
              busy={occupato}
              busyLabel={modifica ? 'Salvataggio…' : 'Creo…'}
              onClick={() => void salva()}
            >
              Salva
            </Button>
          }
        />
      }
    >
      <form
        className="torneo-sheet-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void salva()
        }}
      >
        {/* Durante il salvataggio i campi sono bloccati (UX §5 F2). */}
        <fieldset className="ui-sheet-stack torneo-sheet-fields" disabled={occupato}>
          {breve ? (
            <>
              {nome}
              {data}
              {piazzamento}
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
                <div className="ui-sheet-stack torneo-sheet-more">
                  {conChi}
                  <div className="ui-sheet-stack">{luogo}</div>
                  {categoria}
                  {formatoSuperficie}
                  {tabellone}
                  {colore}
                </div>
              </Disclosure>
            </>
          ) : (
            <>
              {nome}
              {conChi}
              <div className="ui-sheet-pair">
                {data}
                {luogo}
              </div>
              {categoria}
              {formatoSuperficie}
              {piazzamento}
              {tabellone}
              {colore}
            </>
          )}
        </fieldset>

        {!modifica && (
          <Button variant="plain" icon="chat-dots" className="torneo-sheet-assistant" onClick={() => onUseAssistant(sporco)}>
            Preferisci farti guidare? Raccontalo a Solby
          </Button>
        )}

        {modifica && onDelete && (
          <Button variant="glass" tone="danger" icon="trash" block className="ui-sheet-danger" disabled={occupato} onClick={onDelete}>
            Elimina torneo
          </Button>
        )}
      </form>
    </Sheet>
  )
}
