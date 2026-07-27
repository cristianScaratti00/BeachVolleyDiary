// ============================================================================
// Selettore del luogo di gioco, condiviso da TorneoModal e QuickTorneoModal.
//
// Sostituisce il campo "Città" a testo libero: si sceglie un luogo esistente
// oppure lo si crea al volo, esattamente come il selettore compagno che gli sta
// sopra ('' | id | 'new' + campi del nuovo). Da qui in poi scrivere il nome di
// una spiaggia a mano è l'eccezione, non la regola — che è il vero rimedio ai
// doppioni tipo "Riccione" / "riccione " / "Riccione (RN)".
//
// Le coordinate si prendono in tre modi, dal più preciso al più manuale:
// cercando il luogo (Photon/OpenStreetMap), dal GPS del dispositivo, oppure
// incollandole. La ricerca è l'unico punto in cui del testo scritto qui esce
// verso un servizio esterno — vedi `lib/geosearch.ts` per il perché — ed è
// facoltativa: se non risponde, gli altri due modi restano.
// ============================================================================
import { useEffect, useState } from 'react'
import type { CSSProperties, ChangeEvent, ReactNode } from 'react'
import { inputStyle, selectStyle } from './Sheet'
import { venueLabel, parseLatLng, formatLatLng } from '../../lib/derive'
import { cercaLuoghi, MIN_QUERY } from '../../lib/geosearch'
import type { LuogoTrovato } from '../../lib/geosearch'
import type { AnyForm, SetField, Venue } from '../../lib/models'

const MUTED = 'rgba(27,42,74,.5)'
const DANGER = '#FF477E'

// `Sheet.Label` è un <div>: qui i campi sono nuovi, quindi usiamo etichette vere
// associate al controllo (stesso aspetto, classe `.lbl`) — click sull'etichetta
// che dà il focus e nome accessibile identico a quello che si legge.
function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return <label htmlFor={htmlFor} className="lbl" style={{ display: 'block', marginBottom: 6 }}>{children}</label>
}

// Pannello dei campi del luogo nuovo: rientrato e su fondo pieno, così si legge
// come una dipendenza del select invece che come un altro campo del form.
const panelStyle: CSSProperties = {
  marginTop: 10,
  padding: 14,
  borderRadius: 12,
  background: '#F2F0EC',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}
const hintStyle: CSSProperties = { font: "600 11.5px 'Nunito Sans'", color: MUTED, marginTop: 6 }
const miniBtn: CSSProperties = {
  flex: 'none',
  border: '1px solid rgba(27,42,74,.16)',
  background: '#fff',
  color: '#1B2A4A',
  borderRadius: 11,
  padding: '12px 14px',
  font: "700 13px 'Nunito Sans'",
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

interface VenuePickerProps {
  form: AnyForm
  setField: SetField
  venues: Venue[]
  /** Prefill della superficie del torneo con quella tipica del luogo scelto. */
  suggestSurface?: boolean
  /** Unisci due luoghi duplicati. Assente = azione non disponibile. */
  onMerge?: (fromId: string, toId: string) => Promise<boolean>
}

export default function VenuePicker({ form, setField, venues, suggestSurface = false, onMerge }: VenuePickerProps) {
  const selected = form.venueId ?? ''
  const isNew = selected === 'new'
  const current = venues.find((v) => v.id === selected) ?? null

  const pick = (id: string) => {
    setField('venueId', id)
    // La superficie del luogo è un default suggerito, non un vincolo: si scrive
    // sul form (dove resta modificabile), non sul torneo salvato.
    if (suggestSurface && id !== 'new') {
      const v = venues.find((x) => x.id === id)
      if (v?.surface) setField('surface', v.surface)
    }
  }

  return (
    <div>
      <FieldLabel htmlFor="torneo-venue">Dove hai giocato</FieldLabel>
      <select
        id="torneo-venue"
        value={selected}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => pick(e.target.value)}
        style={selectStyle}
      >
        <option value="">— Nessun luogo —</option>
        {venues.map((v) => (
          <option key={v.id} value={v.id}>{venueLabel(v)}</option>
        ))}
        <option value="new">＋ Nuovo luogo</option>
      </select>

      {isNew && <NewVenueFields form={form} setField={setField} />}
      {current && <SelectedVenueNote venue={current} venues={venues} onMerge={onMerge} />}
    </div>
  )
}

// ------------------------------------------------------------ cerca il luogo
// Attesa fra l'ultimo tasto e la richiesta. 350ms è la soglia sotto cui non si
// percepisce ritardo, e sopra cui si smette di interrogare il servizio a ogni
// lettera: scrivere "riccione" fa UNA richiesta, non otto.
const ATTESA_MS = 350

type StatoRicerca = 'fermo' | 'cerco' | 'nessuno' | 'errore'

// Esiti come lista di `button` veri, non una tendina che fluttua sopra il
// modale: stesso pattern dell'elenco città della mappa. Porta gratis tastiera
// e lettura dello screen reader, e dentro un bottom-sheet che già scorre non
// deve inseguire la posizione del campo.
function RicercaLuogo({ onPick }: { onPick: (l: LuogoTrovato) => void }) {
  const [q, setQ] = useState('')
  const [esiti, setEsiti] = useState<LuogoTrovato[]>([])
  const [stato, setStato] = useState<StatoRicerca>('fermo')

  useEffect(() => {
    const testo = q.trim()
    if (testo.length < MIN_QUERY) {
      setEsiti([])
      setStato('fermo')
      return
    }
    // Ogni battuta annulla la ricerca precedente: senza, una risposta lenta
    // arrivata in ritardo sovrascriverebbe i risultati di quella nuova.
    const ac = new AbortController()
    const timer = setTimeout(() => {
      setStato('cerco')
      cercaLuoghi(testo, ac.signal)
        .then((trovati) => {
          setEsiti(trovati)
          setStato(trovati.length ? 'fermo' : 'nessuno')
        })
        .catch(() => {
          // Annullata da noi: la sostituisce la ricerca successiva, non è un
          // errore da mostrare.
          if (ac.signal.aborted) return
          setEsiti([])
          setStato('errore')
        })
    }, ATTESA_MS)
    return () => {
      clearTimeout(timer)
      ac.abort()
    }
  }, [q])

  const scegli = (l: LuogoTrovato) => {
    onPick(l)
    // Fatto: l'elenco sparisce e i campi qui sotto mostrano cosa è stato preso.
    setQ('')
    setEsiti([])
    setStato('fermo')
  }

  const messaggio =
    stato === 'cerco' ? 'Cerco…'
    : stato === 'nessuno' ? 'Nessun luogo trovato. Puoi scrivere i campi a mano qui sotto.'
    : stato === 'errore' ? 'Ricerca non disponibile. Usa il GPS o scrivi i campi a mano.'
    : esiti.length ? `${esiti.length} ${esiti.length === 1 ? 'luogo trovato' : 'luoghi trovati'}`
    : ''

  return (
    <div>
      <FieldLabel htmlFor="venue-search">Cerca il luogo</FieldLabel>
      <input
        id="venue-search"
        type="search"
        value={q}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
        placeholder="es. Bagno 26 Riccione"
        autoComplete="off"
        aria-describedby="venue-search-hint"
        style={inputStyle}
      />
      <div id="venue-search-hint" style={hintStyle}>
        Cerca la spiaggia o la città su OpenStreetMap e compila nome, città e
        coordinate. Scegliere il posto esatto mette il pin sul campo, non sul
        centro della città.
      </div>

      {/* Vive sempre nel DOM, anche vuoto: una regione live inserita solo
          quando ha qualcosa da dire spesso non viene annunciata. */}
      <div role="status" aria-live="polite" style={{ ...hintStyle, color: stato === 'errore' ? DANGER : MUTED }}>
        {messaggio}
      </div>

      {esiti.length > 0 && (
        <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {esiti.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => scegli(l)}
                style={{
                  width: '100%', textAlign: 'left', cursor: 'pointer',
                  border: '1px solid rgba(27,42,74,.16)', background: '#fff',
                  borderRadius: 11, padding: '10px 12px',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ font: "700 13.5px 'Nunito Sans'", color: '#1B2A4A' }}>{l.nome}</span>
                  {/* Il tipo distingue lo stabilimento dal ristorante che si
                      chiama uguale: senza, si sceglie a caso fra otto righe. */}
                  {l.tipo && (
                    <span style={{ font: "700 10.5px 'Nunito Sans'", color: MUTED, background: '#F2F0EC', borderRadius: 6, padding: '2px 6px', whiteSpace: 'nowrap' }}>
                      {l.tipo}
                    </span>
                  )}
                </span>
                {l.contesto && (
                  <span style={{ display: 'block', font: "600 11.5px 'Nunito Sans'", color: MUTED, marginTop: 2 }}>
                    {l.contesto}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ------------------------------------------------------------- luogo nuovo
function NewVenueFields({ form, setField }: { form: AnyForm; setField: SetField }) {
  // 'idle' finché non si chiede la posizione; l'errore resta finché non si
  // riprova, così un permesso negato non sparisce prima di essere letto.
  const [geo, setGeo] = useState<'idle' | 'busy'>('idle')
  const [geoErr, setGeoErr] = useState('')

  const coords = form.newVenueCoords ?? ''
  const parsed = parseLatLng(coords)
  const coordsInvalid = coords.trim().length > 0 && !parsed

  const locate = () => {
    setGeoErr('')
    if (!navigator.geolocation) {
      setGeoErr('Questo browser non condivide la posizione.')
      return
    }
    setGeo('busy')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setField('newVenueCoords', formatLatLng(pos.coords.latitude, pos.coords.longitude))
        setGeo('idle')
      },
      () => {
        setGeo('idle')
        setGeoErr('Posizione non disponibile. Puoi incollare le coordinate a mano.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  // Un risultato scelto riempie i tre campi in un colpo. Restano tutti
  // modificabili: la ricerca è un punto di partenza, non un vincolo — il nome
  // OSM di un bagno non sempre è quello con cui lo chiami tu.
  const usaRisultato = (l: LuogoTrovato) => {
    setGeoErr('')
    setField('newVenueName', l.nome)
    setField('newVenueCity', l.citta)
    setField('newVenueCoords', formatLatLng(l.lat, l.lng))
  }

  return (
    <div style={panelStyle}>
      <RicercaLuogo onPick={usaRisultato} />

      <div>
        <FieldLabel htmlFor="venue-name">Nome del luogo</FieldLabel>
        <input
          id="venue-name"
          value={form.newVenueName ?? ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setField('newVenueName', e.target.value)}
          placeholder="es. Bagno 26"
          style={inputStyle}
        />
      </div>

      <div>
        <FieldLabel htmlFor="venue-city">Città</FieldLabel>
        <input
          id="venue-city"
          value={form.newVenueCity ?? ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setField('newVenueCity', e.target.value)}
          placeholder="es. Riccione"
          style={inputStyle}
        />
      </div>

      <div>
        <FieldLabel htmlFor="venue-coords">Coordinate (facoltative)</FieldLabel>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            id="venue-coords"
            value={coords}
            onChange={(e: ChangeEvent<HTMLInputElement>) => { setGeoErr(''); setField('newVenueCoords', e.target.value) }}
            placeholder="44.00194, 12.65611"
            inputMode="decimal"
            aria-invalid={coordsInvalid || undefined}
            // L'id resta lo stesso sull'aiuto e sull'errore: il campo non punta
            // mai a un elemento sparito.
            aria-describedby="venue-coords-hint"
            style={{ ...inputStyle, flex: 1, minWidth: 150 }}
          />
          <button type="button" className="chip" onClick={locate} disabled={geo === 'busy'} style={{ ...miniBtn, opacity: geo === 'busy' ? 0.6 : undefined, cursor: geo === 'busy' ? 'default' : 'pointer' }}>
            {geo === 'busy' ? 'Cerco…' : '📍 Usa la mia posizione'}
          </button>
        </div>
        {coordsInvalid ? (
          <div id="venue-coords-hint" role="alert" style={{ ...hintStyle, color: DANGER }}>
            Servono due numeri, latitudine e longitudine: «44.00194, 12.65611».
          </div>
        ) : (
          <div id="venue-coords-hint" style={hintStyle}>
            Servono solo per la mappa. Puoi incollarle da un'altra app o prenderle dal GPS.
          </div>
        )}
        {geoErr && <div role="alert" style={{ ...hintStyle, color: DANGER }}>{geoErr}</div>}
      </div>
    </div>
  )
}

// --------------------------------------------------- luogo scelto + "unisci"
function SelectedVenueNote({ venue, venues, onMerge }: {
  venue: Venue
  venues: Venue[]
  onMerge?: (fromId: string, toId: string) => Promise<boolean>
}) {
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  // Si può unire solo verso un altro luogo, e solo se ne esiste almeno un altro:
  // senza doppioni il comando non serve e sparisce.
  const others = venues.filter((v) => v.id !== venue.id)
  const canMerge = !!onMerge && others.length > 0 && !venue.shared

  const merge = async () => {
    if (!onMerge || !target || busy) return
    setBusy(true)
    setErr('')
    const ok = await onMerge(venue.id, target)
    setBusy(false)
    if (ok) { setOpen(false); setTarget('') }
    else setErr('Non è stato possibile unire i due luoghi.')
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', font: "600 11.5px 'Nunito Sans'", color: MUTED }}>
        <span style={{ flex: 1, minWidth: 140 }}>
          {venue.lat != null ? 'Posizione salvata: la mappa compare nel dettaglio del torneo.' : 'Nessuna coordinata: il dettaglio non mostrerà la mappa.'}
        </span>
        {canMerge && (
          <button
            type="button"
            className="chip"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            style={{ flex: 'none', border: 'none', background: 'transparent', color: '#FF6B35', font: "700 12px 'Nunito Sans'", cursor: 'pointer', padding: 0 }}
          >
            {open ? 'Annulla' : 'Unisci a…'}
          </button>
        )}
      </div>

      {open && canMerge && (
        <div style={panelStyle}>
          <div style={{ font: "600 12.5px 'Nunito Sans'", color: '#1B2A4A', lineHeight: 1.45 }}>
            I tornei di <b>{venueLabel(venue)}</b> passano al luogo scelto e questo viene eliminato.
            Le partite e le statistiche restano: cambia solo il posto a cui sono appese.
          </div>
          <div>
            <FieldLabel htmlFor="venue-merge-target">Luogo da tenere</FieldLabel>
            <select id="venue-merge-target" value={target} onChange={(e: ChangeEvent<HTMLSelectElement>) => setTarget(e.target.value)} style={selectStyle}>
              <option value="">— Scegli il luogo da tenere —</option>
              {others.map((v) => (
                <option key={v.id} value={v.id}>{venueLabel(v)}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="chip"
            onClick={merge}
            disabled={!target || busy}
            style={{ ...miniBtn, background: '#1B2A4A', color: '#fff', border: 'none', opacity: !target || busy ? 0.5 : undefined, cursor: !target || busy ? 'default' : 'pointer' }}
          >
            {busy ? 'Unisco…' : 'Unisci i due luoghi'}
          </button>
          {err && <div role="alert" style={{ ...hintStyle, marginTop: 0, color: DANGER }}>{err}</div>}
        </div>
      )}
    </div>
  )
}
