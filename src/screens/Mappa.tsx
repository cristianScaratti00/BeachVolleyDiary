// ============================================================================
// Tornei · Mappa: "la mappa delle conquiste" (UX §5 F4, §6.3). Un pin per ogni
// città in cui hai giocato, colorato dal miglior piazzamento ottenuto lì.
//
// Presentazionale: riceve un `MappaData` già completo (coordinate comprese) e
// lo dispone. `derive.mappa.ts` non si tocca: l'ordine luogo → gazetteer è un
// invariante fissato dai suoi test.
//
// La mappa vera vive in `ConquisteMap`, caricato in `lazy()`: Leaflet e il
// plugin cluster stanno in un chunk a parte. Qui resta tutto ciò che funziona
// SENZA quel chunk (e senza rete): statistiche, stagione, legenda, filtro ed
// elenco città. L'elenco è la superficie accessibile: i pin non sono fermate
// di tastiera (decisione di accessibilità esistente).
//
// La stagione si vede e si cambia QUI, dove ha effetto (C10): prima pilotava
// la mappa di nascosto dal filtro della Home.
// ============================================================================
import { lazy, Suspense, useId, useRef, useState } from 'react'
import * as m from 'motion/react-m'
import { AnimatePresence, useReducedMotion } from 'motion/react'
import type { MappaCitta, MappaData, MappaPin, MappaTier, MappaTorneoRow } from '../lib/derive.mappa'
import type { TorneiProps } from '../app/contracts'
import { Link } from '../app/router'
import { ENTRATA, FLIP_MAX, MOLLA, SVELTO } from '../components/Motion'
import { useOnline } from '../hooks/useConnection'
import { Badge, Bone, Button, EmptyState, FilterChips, Icon, Note, PlacementBadge, Section, Select, Skeleton, StatGrid, StatTile, nomeVisibile, placementText } from '../components/ui/index'
import './Mappa.css'

const ConquisteMap = lazy(() => import('../components/ConquisteMap'))

const TUTTE = 'tutte'

// Colori dei glifi di legenda: gli STESSI letterali con cui `ConquisteMap`
// disegna i pin (dotForRank, condiviso col mobile), così la legenda insegna
// davvero a leggere la mappa. I pin non passano dai token (ART_DIRECTION §4.5).
const PIN = { vinto: '#FF6B35', podio: '#F7A883', giocato: '#FFFFFF', contorno: '#1B2A4A', punto: '#FFFFFF' } as const

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

  const filtroStagione = stagione.fYear && stagione.fYear !== 'Sempre'
  const selettore = (
    <Select
      className="mappa-season"
      label="Stagione"
      value={stagione.fYear}
      onChange={stagione.setFYear}
      options={stagione.yearOptions.map((y) => ({ value: y, label: y }))}
    />
  )

  const vuota = !dati.citta && !dati.sconosciute.length && !dati.fuoriItalia.length && !dati.senzaCitta
  if (vuota) {
    return (
      <div className="mappa">
        <div className="mappa-toolbar">{selettore}</div>
        {filtroStagione ? (
          <EmptyState
            icon="map"
            title="Nessuna città in questa stagione."
            action={
              <Button variant="tinted" onClick={() => stagione.setFYear('Sempre')}>
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
              <Button variant="tinted" onClick={onNuovoTorneo}>
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
  // La lista va dal risultato migliore al peggiore; la mappa disegna
  // nell'ordine opposto, così i pin oro finiscono sopra ai vicini.
  const inLista = [...dati.pins].reverse().filter((p) => attivo === TUTTE || p.tier === attivo)
  // Oltre FLIP_MAX righe che si spostano, il layout cambia senza animazione.
  const flip = inLista.length <= FLIP_MAX

  const seleziona = (key: string) => {
    const next = sel === key ? null : key
    setSel(next)
    // jsdom non implementa `scrollIntoView`: l'opzionale è la guardia.
    if (next) righe.current[next]?.scrollIntoView?.({ block: 'nearest', behavior: ridotto ? 'auto' : 'smooth' })
  }

  return (
    <div className="mappa">
      <div className="mappa-toolbar">{selettore}</div>

      <StatGrid cols={4} className="mappa-stats" label="Le tue città">
        <StatTile value={dati.citta} label="città" />
        <StatTile value={dati.cittaVinte} label="conquistate" tone="win" />
        <StatTile value={dati.cittaConPodio} label="con podio" />
        <StatTile value={dati.tornei} label="tornei" />
      </StatGrid>

      {dati.migliore && (
        <p className="mappa-best">
          Il tuo posto migliore è <strong>{dati.migliore.city}</strong>: {placementText(dati.migliore.best)}
          {dati.migliore.count > 1 ? ` in ${dati.migliore.count} tornei` : ''}.
        </p>
      )}

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
          <ConquisteMap pins={dati.pins} selected={sel} onSelect={seleziona} srSummary={dati.srSummary} />
        </Suspense>
        {!online && (
          <p className="mappa-offline" role="note">
            <Icon name="wifi-off" size={20} />
            Mappa non disponibile senza rete: l'elenco qui sotto ha tutte le città.
          </p>
        )}
        <Legenda rows={dati.legenda} />
        {dati.pins.some((p) => !p.preciso) && (
          <Note className="mappa-approx">
            Alcuni pin cadono sul centro della città: sono i tornei senza un luogo geolocalizzato.
            Aggiungi le coordinate al luogo e il pin si sposta sul campo dove hai giocato davvero.
          </Note>
        )}
      </div>

      {opzioni.length > 0 && (
        <FilterChips
          className="mappa-chips"
          label="Filtra le città per risultato"
          value={attivo}
          onChange={setTier}
          options={[
            { value: TUTTE, label: 'Tutte' },
            ...opzioni.map((o) => ({ value: o.tier, label: `${o.label} · ${o.count}` })),
          ]}
        />
      )}

      <Section title={inLista.length === 1 ? '1 città' : `${inLista.length} città`}>
        {inLista.length === 0 ? (
          <EmptyState icon="map" level={3} title="Nessuna città con questo risultato." />
        ) : (
          <ul className="mappa-list">
            {inLista.map((p) => (
              <RigaCitta
                key={p.key}
                p={p}
                open={sel === p.key}
                flip={flip}
                onToggle={() => seleziona(p.key)}
                rowRef={(el) => {
                  righe.current[p.key] = el
                }}
              />
            ))}
          </ul>
        )}
      </Section>

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

      {(dati.senzaCitta > 0 || dati.nonGiocati > 0) && (
        <div className="mappa-notes">
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
 * Il miglior risultato della città: come PlacementBadge, ma il tono viene dal
 * tier della città (vinto o podio = accento), non da un letterale della lib.
 */
function BadgeRisultato({ best, podio }: { best: string; podio: boolean }) {
  const testo = placementText(best)
  const primo = testo !== best.trim()
  return (
    <Badge tone={podio ? 'accent' : 'neutral'}>
      {primo && <Icon name="trophy" size={12} />}
      <span aria-hidden={primo || undefined}>{testo}</span>
      {primo && <span className="sr-only">{testo.replace('1°', 'Primo posto')}</span>}
    </Badge>
  )
}

// ---------------------------------------------------------------- legenda
// In DOM reale, mai solo dentro la mappa: è il testo a dire cosa vuol dire
// ogni forma. Le tre righe ci sono sempre, anche a zero.
function Legenda({ rows }: { rows: MappaData['legenda'] }) {
  return (
    <ul className="mappa-legend">
      {rows.map((r) => (
        <li key={r.tier} className="mappa-legend-item">
          <GlifoTier tier={r.tier} />
          <span className="mappa-legend-label">{r.label}</span>
          <span>· {r.count}</span>
        </li>
      ))}
    </ul>
  )
}

// Lo stesso disegno del pin, in miniatura: forma e contorno identici.
function GlifoTier({ tier }: { tier: MappaTier }) {
  return (
    <svg className="mappa-glyph" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx={8} cy={8} r={6} style={{ fill: PIN[tier], stroke: PIN.contorno }} strokeWidth={1.4} />
      {tier === 'vinto' && <circle cx={8} cy={8} r={2} style={{ fill: PIN.punto }} />}
    </svg>
  )
}

// ---------------------------------------------------------------- riga città
// Un `button` vero con `aria-expanded`. Aprirla segue lo schema della pila
// (MOTION.md §4.3): l'elenco entra al suo posto in ENTRATA, chi esce va fuori
// dal flusso a t0 (`popLayout`) e svanisce in SVELTO, le righe sotto
// scivolano in FLIP. Nessuna altezza animata.
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
        <GlifoTier tier={p.tier} />
        <span className="mappa-city-text">
          <span className="mappa-city-name">
            {p.city}
            {p.shared && <Badge>Condiviso</Badge>}
          </span>
          {/* L'etichetta arriva dalla lib con il piazzamento grezzo dentro
              («miglior risultato 1° 🏆», C15): il trofeo lo dice già il badge. */}
          <span className="mappa-city-label">{placementText(p.label)}</span>
        </span>
        {/* Il risultato in chiaro accanto al pallino: il colore non è mai
            l'unico canale (WCAG 1.4.1). */}
        <BadgeRisultato best={p.best} podio={p.tier !== 'giocato'} />
        <Icon name="chevron-down" size={20} className="mappa-city-chev" />
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
              {p.played > 0 && ` · ${p.record} · ${p.winPct}% vittorie`}
            </p>
            <ElencoTornei tornei={p.tornei} />
          </m.div>
        )}
      </AnimatePresence>
    </m.li>
  )
}

// I tornei di una città: link veri col NOME del torneo come nome accessibile
// (prima erano «Apri il torneo X»); data e piazzamento stanno accanto.
function ElencoTornei({ tornei }: { tornei: MappaTorneoRow[] }) {
  return (
    <ul className="mappa-tornei">
      {tornei.map((t) => (
        <li key={t.id} className="mappa-torneo">
          <Link to={{ name: 'torneo', id: t.id }} className="mappa-torneo-link">
            {nomeVisibile(t.name)}
          </Link>
          <span className="mappa-torneo-date">{t.dateLabel}</span>
          {t.shared && <Badge>Condiviso</Badge>}
          <PlacementBadge label={t.badge} libBg={t.badgeBg} />
        </li>
      ))}
    </ul>
  )
}

// ---------------------------------------------------------------- fuori mappa
// Le città che non diventano un pin non spariscono: mostrarle è ciò che rende
// scopribile un buco del gazetteer o un refuso.
function FuoriMappa({ title, nota, citta }: { title: string; nota: string; citta: MappaCitta[] }) {
  return (
    <Section title={title} className="mappa-bucket">
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
    </Section>
  )
}
