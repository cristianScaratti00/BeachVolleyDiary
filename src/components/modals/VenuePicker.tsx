// ============================================================================
// Selettore del luogo di gioco dello sheet «Nuovo torneo» (TorneoSheet).
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
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent, ReactNode } from 'react'
import { venueLabel, parseLatLng, formatLatLng } from '../../lib/derive'
import { Icon } from '../ui/Icon'
import { Badge } from '../ui/Badge'
import './VenuePicker.css'
import { cercaLuoghi, cercaCitta, MIN_QUERY } from '../../lib/geosearch'
import type { LuogoTrovato, CittaTrovata } from '../../lib/geosearch'
import type { AnyForm, SetField, Venue } from '../../lib/models'

// Etichette vere associate al controllo: un clic sull'etichetta dà il focus e
// il nome accessibile è quello che si legge.
function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return <label htmlFor={htmlFor} className="ui-field-label">{children}</label>
}

// Le note sotto un campo: aiuto (--ink-2) o errore (--danger, solo su fondo opaco).
function Hint({ id, tone, role, label, children }: { id?: string; tone?: 'danger'; role?: 'alert' | 'status'; label?: string; children?: ReactNode }) {
  return (
    <div
      id={id}
      className="venue-hint"
      data-tone={tone}
      role={role}
      aria-live={role === 'status' ? 'polite' : undefined}
      aria-label={label}
    >
      {children}
    </div>
  )
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
    <div className="venue ui-field">
      <FieldLabel htmlFor="torneo-venue">Dove hai giocato</FieldLabel>
      <span className="ui-select-wrap">
        <select
          id="torneo-venue"
          className="ui-input ui-select"
          value={selected}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => pick(e.target.value)}
        >
          <option value="">Nessun luogo</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>{venueLabel(v)}</option>
          ))}
          <option value="new">＋ Nuovo luogo…</option>
        </select>
        <Icon name="chevron-down" size={16} className="ui-select-chev" />
      </span>

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
    <div className="ui-field">
      <FieldLabel htmlFor="venue-search">Cerca il luogo</FieldLabel>
      <input
        id="venue-search"
        className="ui-input"
        type="search"
        value={q}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
        placeholder="es. Bagno 26 Riccione"
        autoComplete="off"
        aria-describedby="venue-search-hint"
      />
      <Hint id="venue-search-hint">
        Cerca la spiaggia o la città su OpenStreetMap e compila nome, città e
        coordinate. Scegliere il posto esatto mette il pin sul campo, non sul
        centro della città.
      </Hint>

      {/* Vive sempre nel DOM, anche vuoto: una regione live inserita solo
          quando ha qualcosa da dire spesso non viene annunciata. Il nome la
          distingue da quella del campo "Città", che sta nello stesso pannello. */}
      <Hint role="status" label="Esito della ricerca del luogo" tone={stato === 'errore' ? 'danger' : undefined}>
        {messaggio}
      </Hint>

      {esiti.length > 0 && (
        <ul className="ui-list venue-results">
          {esiti.map((l) => (
            <li key={l.id} className="ui-list-item">
              <button type="button" className="ui-row venue-result" onClick={() => scegli(l)}>
                <span className="ui-row-text">
                  <span className="venue-result-name">
                    <span className="ui-row-title">{l.nome}</span>
                    {/* Il tipo distingue lo stabilimento dal ristorante che si
                        chiama uguale: senza, si sceglie a caso fra otto righe. */}
                    {l.tipo && <Badge>{l.tipo}</Badge>}
                  </span>
                  {l.contesto && <span className="ui-row-sub">{l.contesto}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ------------------------------------------------------------------- città
//
// Il campo "Città" è un combobox sullo stesso gazetteer della ricerca qui
// sopra, non più un input a testo libero. Motivo: la ricerca del luogo risolve
// la spiaggia, ma chi compila i campi a mano continuava a produrre "Riccione" /
// "riccione " / "Riccione (RN)" — tre città diverse per la mappa e per i
// raggruppamenti, un doppione solo da guardare.
//
// Resta un input vero, non un select: si gioca anche dove il gazetteer non
// arriva, e lì si scrive a mano e si salva lo stesso. La tendina suggerisce,
// non vincola — e se il servizio non risponde il campo non cambia mestiere.
//
// Qui una tendina in overlay invece dell'elenco statico usato dalla ricerca del
// luogo: quello riempie tre campi ed è il centro del pannello, questo è un
// campo fra gli altri, e spingere in basso il resto del form ad ogni lettera
// farebbe ballare tutto ciò che sta sotto.

function CittaAutocomplete({ value, onChange }: { value: string; onChange: (citta: string) => void }) {
  // `q` è solo quello che viene DIGITATO: la ricerca del luogo qui sopra scrive
  // in `value` senza passare di qui, e non deve far comparire una tendina su un
  // campo che l'utente non ha toccato.
  const [q, setQ] = useState('')
  const [esiti, setEsiti] = useState<CittaTrovata[]>([])
  const [aperto, setAperto] = useState(false)
  const [attivo, setAttivo] = useState(-1)
  const [stato, setStato] = useState<StatoRicerca>('fermo')
  const listaRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const testo = q.trim()
    if (testo.length < MIN_QUERY) {
      setEsiti([])
      setAperto(false)
      setStato('fermo')
      return
    }
    const ac = new AbortController()
    const timer = setTimeout(() => {
      setStato('cerco')
      cercaCitta(testo, ac.signal)
        .then((trovate) => {
          setEsiti(trovate)
          setAttivo(-1)
          setAperto(trovate.length > 0)
          setStato(trovate.length ? 'fermo' : 'nessuno')
        })
        .catch(() => {
          if (ac.signal.aborted) return
          setEsiti([])
          setAperto(false)
          setStato('errore')
        })
    }, ATTESA_MS)
    return () => {
      clearTimeout(timer)
      ac.abort()
    }
  }, [q])

  // La tendina si apre dentro un foglio che scorre: se il campo sta in fondo,
  // nasce sotto il bordo visibile e sembra che non sia successo niente. Il
  // foglio la va a prendere da sé.
  useEffect(() => {
    if (aperto) listaRef.current?.scrollIntoView({ block: 'nearest' })
  }, [aperto])

  // La voce raggiunta da tastiera deve restare dentro la tendina, che ha una
  // sua altezza massima: senza questo, dal quinto risultato in giù si naviga
  // alla cieca.
  useEffect(() => {
    if (attivo < 0) return
    listaRef.current?.children[attivo]?.scrollIntoView({ block: 'nearest' })
  }, [attivo])

  const scegli = (c: CittaTrovata) => {
    onChange(c.nome)
    setAperto(false)
    setAttivo(-1)
    setStato('fermo')
  }

  const suTasto = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      if (!esiti.length) return
      e.preventDefault()
      if (!aperto) {
        setAperto(true)
        setAttivo(0)
        return
      }
      setAttivo((i) => (i + 1) % esiti.length)
    } else if (e.key === 'ArrowUp') {
      if (!aperto || !esiti.length) return
      e.preventDefault()
      setAttivo((i) => (i <= 0 ? esiti.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      // Solo con una voce evidenziata: a tendina aperta ma senza selezione
      // l'Invio deve restare quello del form, non mangiare il tasto.
      if (aperto && attivo >= 0 && esiti[attivo]) {
        e.preventDefault()
        scegli(esiti[attivo])
      }
    } else if (e.key === 'Escape') {
      if (!aperto) return
      e.preventDefault()
      setAperto(false)
      setAttivo(-1)
    }
  }

  const messaggio =
    stato === 'cerco' ? 'Cerco…'
    : stato === 'nessuno' ? 'Nessuna città trovata: puoi scriverla a mano.'
    : stato === 'errore' ? 'Suggerimenti non disponibili: scrivi la città a mano.'
    : ''

  return (
    <div className="ui-field">
      <FieldLabel htmlFor="venue-city">Città</FieldLabel>
      <div className="venue-combo">
        <input
          id="venue-city"
          className="ui-input"
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            onChange(e.target.value)
            setQ(e.target.value)
          }}
          onKeyDown={suTasto}
          // La scelta col mouse arriva dopo il blur: le voci annullano il
          // `mousedown`, così il campo non perde il fuoco e il click va a segno.
          onBlur={() => { setAperto(false); setAttivo(-1) }}
          placeholder="es. Riccione"
          autoComplete="off"
          role="combobox"
          aria-expanded={aperto}
          aria-controls="venue-city-list"
          aria-autocomplete="list"
          aria-activedescendant={aperto && attivo >= 0 ? `venue-city-opt-${attivo}` : undefined}
          aria-describedby="venue-city-hint"
        />

        {/* Sempre nel DOM anche da chiusa: `aria-controls` deve puntare a
            qualcosa che esiste, o la relazione si rompe a metà. */}
        <ul
          ref={listaRef}
          id="venue-city-list"
          role="listbox"
          aria-label="Città trovate"
          hidden={!aperto || esiti.length === 0}
          className="venue-listbox ui-scroll"
        >
          {esiti.map((c, i) => (
            <li
              key={c.id}
              id={`venue-city-opt-${i}`}
              role="option"
              aria-selected={i === attivo}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setAttivo(i)}
              onClick={() => scegli(c)}
              className="venue-option"
            >
              <span className="venue-option-name">{c.nome}</span>
              {/* Senza il contesto le sei "Milano" della lista sono identiche. */}
              {c.contesto && <span className="venue-option-ctx">{c.contesto}</span>}
            </li>
          ))}
        </ul>
      </div>

      <Hint id="venue-city-hint">
        Scrivi le prime lettere e scegli dai suggerimenti: così la stessa città
        resta scritta allo stesso modo ovunque. Se non c'è, scrivila a mano.
      </Hint>

      {/* Separata dall'aiuto, come nella ricerca qui sopra: l'aiuto si legge al
          fuoco e non cambia mai, questa parla solo quando ha una novità. */}
      <Hint role="status" label="Esito della ricerca della città" tone={stato === 'errore' ? 'danger' : undefined}>
        {messaggio}
      </Hint>
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
    <div className="venue-panel">
      <RicercaLuogo onPick={usaRisultato} />

      <div className="ui-field">
        <FieldLabel htmlFor="venue-name">Nome del luogo</FieldLabel>
        <input
          id="venue-name"
          className="ui-input"
          value={form.newVenueName ?? ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setField('newVenueName', e.target.value)}
          placeholder="es. Bagno 26"
        />
      </div>

      <CittaAutocomplete
        value={form.newVenueCity ?? ''}
        onChange={(citta) => setField('newVenueCity', citta)}
      />

      <div className="ui-field">
        <FieldLabel htmlFor="venue-coords">Coordinate (facoltative)</FieldLabel>
        <div className="venue-coords-row">
          <input
            id="venue-coords"
            className="ui-input"
            value={coords}
            onChange={(e: ChangeEvent<HTMLInputElement>) => { setGeoErr(''); setField('newVenueCoords', e.target.value) }}
            placeholder="44.00194, 12.65611"
            inputMode="decimal"
            aria-invalid={coordsInvalid || undefined}
            // L'id resta lo stesso sull'aiuto e sull'errore: il campo non punta
            // mai a un elemento sparito.
            aria-describedby="venue-coords-hint"
          />
          <button
            type="button"
            className="ui-button"
            data-variant="neutral"
            data-size="md"
            onClick={locate}
            aria-busy={geo === 'busy' || undefined}
            aria-disabled={geo === 'busy' || undefined}
          >
            <Icon name="pin" size={20} />
            <span className="ui-button-label">{geo === 'busy' ? 'Cerco…' : 'Usa la mia posizione'}</span>
          </button>
        </div>
        {coordsInvalid ? (
          <Hint id="venue-coords-hint" role="alert" tone="danger">
            Servono due numeri, latitudine e longitudine: «44.00194, 12.65611».
          </Hint>
        ) : (
          <Hint id="venue-coords-hint">
            Servono solo per la mappa. Puoi incollarle da un'altra app o prenderle dal GPS.
          </Hint>
        )}
        {geoErr && <Hint role="alert" tone="danger">{geoErr}</Hint>}
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
    <div className="venue-selected">
      <div className="venue-selected-row">
        <span className="venue-hint">
          {venue.lat != null ? 'Posizione salvata: la mappa compare nel dettaglio del torneo.' : 'Nessuna coordinata: il dettaglio non mostrerà la mappa.'}
        </span>
        {canMerge && (
          <button
            type="button"
            className="ui-button"
            data-variant="plain"
            data-size="sm"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="ui-button-label">{open ? 'Annulla' : 'Unisci a…'}</span>
          </button>
        )}
      </div>

      {open && canMerge && (
        <div className="venue-panel">
          <p className="venue-merge-text">
            I tornei di <b>{venueLabel(venue)}</b> passano al luogo scelto e questo viene eliminato.
            Le partite e le statistiche restano: cambia solo il posto a cui sono appese.
          </p>
          <div className="ui-field">
            <FieldLabel htmlFor="venue-merge-target">Luogo da tenere</FieldLabel>
            <span className="ui-select-wrap">
              <select
                id="venue-merge-target"
                className="ui-input ui-select"
                value={target}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setTarget(e.target.value)}
              >
                <option value="">Scegli il luogo da tenere</option>
                {others.map((v) => (
                  <option key={v.id} value={v.id}>{venueLabel(v)}</option>
                ))}
              </select>
              <Icon name="chevron-down" size={16} className="ui-select-chev" />
            </span>
          </div>
          <button
            type="button"
            className="ui-button"
            data-variant="neutral"
            data-size="md"
            onClick={() => {
              // Disattivo finché manca il luogo da tenere: il tocco porta lì.
              if (!target) document.getElementById('venue-merge-target')?.focus()
              else void merge()
            }}
            aria-disabled={!target || busy || undefined}
            aria-busy={busy || undefined}
          >
            <span className="ui-button-label">{busy ? 'Unisco…' : 'Unisci i due luoghi'}</span>
          </button>
          {err && <Hint role="alert" tone="danger">{err}</Hint>}
        </div>
      )}
    </div>
  )
}
