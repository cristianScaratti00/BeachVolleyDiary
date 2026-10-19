// ============================================================================
// Tornei · Mappa: "la mappa delle conquiste" (UX §5 F4, il redesign). Un pin
// per ogni città in cui hai giocato, colorato dal miglior piazzamento ottenuto
// lì: arancio = vinta, bianco col filo d'inchiostro = podio, grigio = giocata.
//
// Presentazionale: riceve un `MappaData` già completo (coordinate comprese) e
// lo dispone. `derive.mappa.ts` non si tocca: l'ordine luogo → gazetteer è un
// invariante fissato dai suoi test.
//
// L'ordine del redesign: i quattro numeri in una card, la card-figura della
// mappa con la legenda, «il tuo posto migliore», le chip che filtrano i pin.
// Sotto, l'elenco delle città: è la superficie accessibile (i pin non sono
// fermate di tastiera, decisione di accessibilità esistente) e porta in testo
// tutto ciò che il pin dice col colore.
//
// La mappa vera vive in `ConquisteMap`, caricato in `lazy()`: Leaflet e il
// plugin cluster stanno in un chunk a parte. Qui resta tutto ciò che funziona
// SENZA quel chunk (e senza rete): statistiche, stagione, legenda, filtro ed
// elenco città.
//
// La stagione si vede e si cambia QUI, dove ha effetto (C10): una capsula
// sobria sopra i numeri, perché li cambia tutti.
// ============================================================================
import { lazy, Suspense, useId, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import * as m from 'motion/react-m'
import { AnimatePresence, useReducedMotion } from 'motion/react'
import type { MappaCitta, MappaData, MappaPin, MappaTier, MappaTorneoRow } from '../lib/derive.mappa'
import { placementRank } from '../lib/stats'
import type { TorneiProps } from '../app/contracts'
import { Link } from '../app/router'
import { ENTRATA, FLIP_MAX, MOLLA, SVELTO } from '../components/Motion'
import { useOnline } from '../hooks/useConnection'
import { Badge, Bone, Button, EmptyState, FilterChips, Icon, Note, Skeleton, nomeVisibile, placementText } from '../components/ui/index'
import { Medal } from '../components/ui/Medal'
import './Mappa.css'

const ConquisteMap = lazy(() => import('../components/ConquisteMap'))

const TUTTE = 'tutte'

/** I blocchi salgono uno dopo l'altro, dopo ricerca (1) e segmented (2). */
const rise = (i: number) => ({ '--rise-i': i }) as CSSProperties

// Le parole del redesign: la legenda parla della città (vinta, giocata), le
// chip delle città che filtrano (vinte, giocate).
const LEGENDA: Record<MappaTier, string> = { vinto: 'Vinta', podio: 'Podio', giocato: 'Giocata' }
const CHIP: Record<MappaTier, string> = { vinto: 'Vinte', podio: 'Podio', giocato: 'Giocate' }

/** «1° · Gold» → «Gold»: il tabellone, che la medaglia non mostra. */
const tabellone = (badge: string) => placementText(badge).split(' · ')[1] ?? ''

const nomeStagione = (y: string) => (!y || y === 'Sempre' ? 'Tutte le stagioni' : `Stagione ${y}`)

export interface MappaProps {
  m: MappaData
  stagione: TorneiProps['stagione']
  onNuovoTorneo: () => void
}

export default function Mappa({ m: dati, stagione, onNuovoTorneo }: MappaProps) {
  // Città selezionata: la stessa per il pin e per la riga di lista. Un solo
  // stato, due superfici — toccare l'uno apre l'altra.
  const [sel, setSel] = useState<string | null>(null)
  const [tier, setTier] = useState<string>(TUTTE)
  const righe = useRef<Record<string, HTMLButtonElement | null>>({})
  const ridotto = useReducedMotion()
  const online = useOnline()
  const idCitta = useId()

  const filtroStagione = stagione.fYear && stagione.fYear !== 'Sempre'
  const selettore = <Stagione stagione={stagione} />

  const vuota = !dati.citta && !dati.sconosciute.length && !dati.fuoriItalia.length && !dati.senzaCitta
  if (vuota) {
    return (
      <div className="mappa">
        <div className="mappa-toolbar rise" style={rise(3)}>{selettore}</div>
        {filtroStagione ? (
          <EmptyState
            icon="map"
            title="Nessuna città in questa stagione."
            action={
              <Button variant="glass" onClick={() => stagione.setFYear('Sempre')}>
                Mostra tutte le stagioni
              </Button>
            }
          />
        ) : dati.nonGiocati > 0 ? (
          // Con dei tornei ancora da giocare la mappa è vuota per un motivo
          // preciso, e dirlo è diverso dal chiedere una città che c'è già.
          <EmptyState
            icon="map"
            title="La mappa racconta quello che hai già giocato."
            text={`${dati.nonGiocati === 1 ? 'Il tuo unico torneo è' : 'I tuoi tornei sono'} ancora in corso o in programma: segna il piazzamento e la città comparirà qui.`}
          />
        ) : (
          <EmptyState
            icon="map"
            title="Nessuna città sulla mappa."
            text="Aggiungi un torneo con il suo luogo e comincia a riempire il passaporto."
            action={
              <Button variant="glass" onClick={onNuovoTorneo}>
                Crea un torneo
              </Button>
            }
          />
        )}
      </div>
    )
  }

  // Le chip ci sono solo se separano qualcosa (la regola di `deriveTorneiSections`).
  const tierPresenti = dati.legenda.filter((l) => l.count > 0)
  const opzioni = tierPresenti.length > 1 ? tierPresenti : []
  const attivo = opzioni.some((o) => o.tier === tier) ? tier : TUTTE
  // Le chip filtrano i pin E l'elenco (il redesign). La mappa disegna dal
  // peggiore al migliore, così i pin arancio finiscono sopra ai vicini; la
  // lista va al contrario, dal risultato migliore.
  const filtrati = dati.pins.filter((p) => attivo === TUTTE || p.tier === attivo)
  const inLista = [...filtrati].reverse()
  // Una città nascosta dal filtro non resta "selezionata" di nascosto.
  const scelta = sel && filtrati.some((p) => p.key === sel) ? sel : null
  // Oltre FLIP_MAX righe che si spostano, il layout cambia senza animazione.
  const flip = inLista.length <= FLIP_MAX

  const seleziona = (key: string) => {
    const next = scelta === key ? null : key
    setSel(next)
    // jsdom non implementa `scrollIntoView`: l'opzionale è la guardia.
    if (next) righe.current[next]?.scrollIntoView?.({ block: 'nearest', behavior: ridotto ? 'auto' : 'smooth' })
  }

  return (
    <div className="mappa">
      <div className="mappa-toolbar rise" style={rise(3)}>{selettore}</div>

      {/* I quattro numeri in colonna, divisi da un filo (il redesign). */}
      <dl className="mappa-stats rise" style={rise(4)}>
        <Numero valore={dati.citta} etichetta="città" />
        <Numero valore={dati.cittaVinte} etichetta="conquistate" vinto />
        <Numero valore={dati.cittaConPodio} etichetta="con podio" />
        <Numero valore={dati.tornei} etichetta="tornei" />
      </dl>

      <figure className="mappa-figure rise" style={rise(5)} aria-label="Mappa delle conquiste">
        <div className="mappa-frame">
          {/* Il segnaposto ha l'altezza esatta della mappa: quando arriva il
              chunk di Leaflet non si sposta niente sotto le dita. */}
          <Suspense
            fallback={
              <Skeleton className="mappa-skel" label="Carico la mappa…">
                <Bone className="mappa-skel-box" />
              </Skeleton>
            }
          >
            <ConquisteMap pins={filtrati} selected={scelta} onSelect={seleziona} srSummary={dati.srSummary} />
          </Suspense>
        </div>
        {!online && (
          <p className="mappa-offline" role="note">
            <Icon name="wifi-off" size={16} />
            Mappa non disponibile senza rete: l'elenco qui sotto ha tutte le città.
          </p>
        )}
        <figcaption>
          <Legenda />
        </figcaption>
      </figure>

      {dati.migliore && (
        <p className="mappa-best rise" style={rise(6)}>
          Il tuo posto migliore è <strong>{dati.migliore.city}</strong>: {fraseMigliore(dati.migliore)}.
        </p>
      )}

      {opzioni.length > 0 && (
        <div className="mappa-chips rise" style={rise(7)}>
          <FilterChips
            label="Filtra le città per risultato"
            value={attivo}
            onChange={setTier}
            options={[
              { value: TUTTE, label: 'Tutte' },
              ...opzioni.map((o) => ({ value: o.tier, label: `${CHIP[o.tier]} · ${o.count}` })),
            ]}
          />
        </div>
      )}

      <section className="mappa-section rise" style={rise(8)} aria-labelledby={idCitta}>
        <h2 className="mappa-h2" id={idCitta}>{inLista.length === 1 ? '1 città' : `${inLista.length} città`}</h2>
        {inLista.length === 0 ? (
          <EmptyState icon="map" level={3} title="Nessuna città con questo risultato." />
        ) : (
          <ul className="mappa-list">
            {inLista.map((p) => (
              <RigaCitta
                key={p.key}
                p={p}
                open={scelta === p.key}
                flip={flip}
                onToggle={() => seleziona(p.key)}
                rowRef={(el) => {
                  righe.current[p.key] = el
                }}
              />
            ))}
          </ul>
        )}
      </section>

      {dati.fuoriItalia.length > 0 && (
        <FuoriMappa
          title="Fuori dall'Italia"
          nota="Il riquadro resta l'Italia: una trasferta all'estero non deve rimpicciolire il resto della mappa."
          citta={dati.fuoriItalia}
        />
      )}

      {dati.sconosciute.length > 0 && (
        <FuoriMappa
          title="Non ancora sulla mappa"
          nota="Queste città non sono nell'elenco di località conosciute. Un refuso? Correggilo dal torneo. Altrimenti verrà aggiunta."
          citta={dati.sconosciute}
        />
      )}

      {(dati.senzaCitta > 0 || dati.nonGiocati > 0 || dati.pins.some((p) => !p.preciso)) && (
        <div className="mappa-notes">
          {dati.pins.some((p) => !p.preciso) && (
            <Note>
              Alcuni pin cadono sul centro della città: sono i tornei senza un luogo geolocalizzato.
              Aggiungi le coordinate al luogo e il pin si sposta sul campo dove hai giocato davvero.
            </Note>
          )}
          {dati.senzaCitta > 0 && (
            <Note>
              {dati.senzaCitta === 1
                ? '1 torneo non ha un luogo: aggiungilo dal torneo e comparirà qui.'
                : `${dati.senzaCitta} tornei non hanno un luogo: aggiungilo dal torneo e compariranno qui.`}
            </Note>
          )}
          {dati.nonGiocati > 0 && (
            <Note>
              {dati.nonGiocati === 1 ? '1 torneo è' : `${dati.nonGiocati} tornei sono`} ancora in corso o in
              programma: la mappa racconta solo quello che hai già giocato.
            </Note>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * «1° in 3 tornei» quando lì sei sempre arrivato primo; «1° in 2 tornei su 3»
 * quando no: il numero dice quante volte, non quanti tornei ci hai giocato.
 */
function fraseMigliore(p: MappaPin): string {
  const best = placementText(p.best).split(' · ')[0]
  const volte = p.tornei.filter((t) => placementRank(placementText(t.badge).split(' · ')[0]) === p.rank).length || 1
  if (volte >= p.count) return p.count > 1 ? `${best} in ${p.count} tornei` : best
  return `${best} in ${volte === 1 ? '1 torneo' : `${volte} tornei`} su ${p.count}`
}

function Numero({ valore, etichetta, vinto = false }: { valore: number; etichetta: string; vinto?: boolean }) {
  return (
    <div className="mappa-stat">
      {/* Etichetta prima nel DOM (dt prima di dd), numero sopra a vista. */}
      <dt className="mappa-stat-label">{etichetta}</dt>
      <dd className="mappa-stat-value" data-tone={vinto ? 'win' : undefined}>{valore}</dd>
    </div>
  )
}

// ---------------------------------------------------------------- stagione
// Una capsula come le chip, con il `<select>` nativo steso sopra (trasparente,
// alto 44): la lista delle stagioni resta quella del sistema, la più comoda
// sul telefono, e il nome accessibile è «Stagione».
function Stagione({ stagione }: { stagione: TorneiProps['stagione'] }) {
  const id = useId()
  return (
    <div className="mappa-season">
      <label htmlFor={id} className="sr-only">Stagione</label>
      <Icon name="calendar" size={16} />
      <span className="mappa-season-value" aria-hidden="true">{nomeStagione(stagione.fYear)}</span>
      <Icon name="chevron-down" size={16} className="mappa-season-chev" />
      <select id={id} className="mappa-season-select" value={stagione.fYear} onChange={(e) => stagione.setFYear(e.target.value)}>
        {stagione.yearOptions.map((y) => (
          <option key={y} value={y}>{nomeStagione(y)}</option>
        ))}
      </select>
    </div>
  )
}

// ---------------------------------------------------------------- legenda
// In DOM reale, mai solo dentro la mappa: è il testo a dire cosa vuol dire
// ogni pallino. Le tre voci ci sono sempre, anche a zero: i numeri li hanno
// le chip e la card dei numeri.
function Legenda() {
  return (
    <ul className="mappa-legend">
      {(['vinto', 'podio', 'giocato'] as MappaTier[]).map((t) => (
        <li key={t} className="mappa-legend-item">
          <GlifoTier tier={t} />
          {LEGENDA[t]}
        </li>
      ))}
    </ul>
  )
}

// Lo stesso disegno del pin, in miniatura: riempimento e filo identici
// (Mappa.css, sugli stessi token dei letterali di ConquisteMap).
function GlifoTier({ tier }: { tier: MappaTier }) {
  return (
    <svg className="mappa-glyph" data-tier={tier} viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <circle cx={6} cy={6} r={5} />
    </svg>
  )
}

// ---------------------------------------------------------------- riga città
// Un `button` vero con `aria-expanded`. Aprirla segue lo schema della pila
// (MOTION.md §4.3): l'elenco entra al suo posto in ENTRATA, chi esce va fuori
// dal flusso a t0 (`popLayout`) e svanisce in SVELTO, le righe sotto
// scivolano in FLIP. Nessuna altezza animata.
// La medaglia è il miglior piazzamento della città: ha gli stessi tre colori
// del pin, e il risultato è anche scritto (il colore non è mai l'unico canale,
// WCAG 1.4.1).
function RigaCitta({ p, open, flip, onToggle, rowRef }: {
  p: MappaPin
  open: boolean
  flip: boolean
  onToggle: () => void
  rowRef: (el: HTMLButtonElement | null) => void
}) {
  const id = useId()
  return (
    <m.li className="mappa-city" layout={flip ? 'position' : false} transition={MOLLA}>
      <button ref={rowRef} type="button" className="mappa-city-row" aria-expanded={open} aria-controls={open ? id : undefined} onClick={onToggle}>
        <Medal placement={p.best} size="md" />
        <span className="mappa-city-text">
          <span className="mappa-city-name">
            {p.city}
            {p.shared && <Badge>Condiviso</Badge>}
          </span>
          {/* L'etichetta arriva dalla lib con il piazzamento grezzo dentro
              («miglior risultato 1° 🏆», C15): l'emoji esce. */}
          <span className="mappa-city-label">{placementText(p.label)}</span>
        </span>
        <Icon name="chevron-down" size={16} className="mappa-city-chev" />
      </button>
      <AnimatePresence mode="popLayout" initial={false}>
        {open && (
          <m.div
            key="tornei"
            id={id}
            className="mappa-city-tornei"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: ENTRATA }}
            exit={{ opacity: 0, transition: SVELTO }}
          >
            <p className="mappa-city-sum">
              {p.count === 1 ? '1 torneo qui' : `${p.count} tornei qui`}
              {p.played > 0 && ` · ${p.record.replace('-', '–')} · ${p.winPct}% vittorie`}
            </p>
            <ElencoTornei tornei={p.tornei} />
          </m.div>
        )}
      </AnimatePresence>
    </m.li>
  )
}

// I tornei di una città: link veri col NOME del torneo come nome accessibile,
// estesi alla riga; data, tabellone e «Condiviso» accanto, la medaglia a destra.
function ElencoTornei({ tornei }: { tornei: MappaTorneoRow[] }) {
  return (
    <ul className="mappa-tornei">
      {tornei.map((t) => {
        const girone = tabellone(t.badge)
        return (
          <li key={t.id} className="mappa-torneo">
            <span className="mappa-torneo-text">
              <Link to={{ name: 'torneo', id: t.id }} className="mappa-torneo-link">
                {nomeVisibile(t.name)}
              </Link>
              <span className="mappa-torneo-meta">
                <span className="mappa-torneo-date">{t.dateLabel}</span>
                {girone && <Badge>{girone}</Badge>}
                {t.shared && <Badge>Condiviso</Badge>}
              </span>
            </span>
            <Medal placement={t.badge} size="sm" />
          </li>
        )
      })}
    </ul>
  )
}

// ---------------------------------------------------------------- fuori mappa
// Le città che non diventano un pin non spariscono: mostrarle è ciò che rende
// scopribile un buco del gazetteer o un refuso.
function FuoriMappa({ title, nota, citta }: { title: string; nota: string; citta: MappaCitta[] }) {
  const id = useId()
  return (
    <section className="mappa-section mappa-bucket" aria-labelledby={id}>
      <h2 className="mappa-h2" id={id}>{title}</h2>
      <Note className="mappa-bucket-note">{nota}</Note>
      <ul className="mappa-list">
        {citta.map((c) => (
          <li key={c.key} className="mappa-city mappa-bucket-city">
            <p className="mappa-bucket-head">
              <span className="mappa-city-name">{c.city}</span>
              <span className="mappa-city-label">{c.count === 1 ? '1 torneo' : `${c.count} tornei`}</span>
            </p>
            <ElencoTornei tornei={c.tornei} />
          </li>
        ))}
      </ul>
    </section>
  )
}
