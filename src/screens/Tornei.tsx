// ============================================================================
// Tornei (UX §5 F4, il redesign): l'archivio, in due viste degli stessi tornei
// — Lista · Mappa — sotto UNA ricerca. La Timeline non sta più qui: è la tab
// Diario (`/tornei/timeline` porta lì).
//
// - Il sottotitolo descrive ciò che si vede ed è l'unica live region della
//   schermata (`role="status"`): sulla Lista conta le righe visibili col
//   formato attivo (difetto #1), con la ricerca i risultati.
// - La ricerca vale per tutte e due le viste: con un testo, segmented e chip
//   spariscono e al loro posto ci sono i risultati, nella forma del Diario. Il
//   testo vive qui (i risultati cambiano nello stesso fotogramma del tasto) e
//   sale all'URL (`?q=`, in replace) dopo 250ms.
// - «Prossimi tornei» sta SOPRA le chip del formato e non le ascolta: le chip
//   filtrano l'archivio che hanno sotto. Se filtrassero anche i prossimi, il
//   blocco sopra cambierebbe altezza e le chip scapperebbero da sotto il dito
//   al primo tocco.
// - Ogni gruppo è UNA card con le righe dentro (il redesign): medaglia del
//   piazzamento, nome-link esteso alla riga, record, chevron.
// - Il cambio di vista dal segmented lascia il focus sul segmento (M4).
// - Niente "Nuovo torneo" nell'intestazione: si crea dal ＋, dalla Sidebar e
//   dal riquadro vuoto dei prossimi.
// ============================================================================
import { Suspense, useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { deriveDiarySearch, deriveTorneiSections, TORNEI_FILTER_ALL } from '../lib/derive'
import type { TorneoCard } from '../lib/derive'
import { placementRank } from '../lib/stats'
import type { TorneiProps } from '../app/contracts'
import type { TorneiVista } from '../app/routes'
import { Link, scrollToTop } from '../app/router'
import { LazyBoundary, lazyRetry } from '../app/LazyBoundary'
import { sottotitoloTornei } from '../app/selectors'
import {
  Badge,
  Bone,
  Button,
  EmptyState,
  FilterChips,
  Icon,
  IconButton,
  NavBar,
  Page,
  SearchField,
  SegmentedControl,
  Skeleton,
  nomeVisibile,
  placementText,
} from '../components/ui/index'
import { Medal } from '../components/ui/Medal'
import Mappa from './Mappa'
import './Tornei.css'

// I risultati della ricerca hanno la forma delle voci del Diario: stanno nel
// suo chunk, scaricato solo da chi cerca.
const Timeline = lazyRetry(() => import('./Timeline'))

/** Quanto aspetta la ricerca prima di scrivere `?q=` nell'URL (UX §4.2). */
const DEBOUNCE_MS = 250

/** I blocchi salgono uno dopo l'altro fino a qui; dopo, tutti insieme. */
const RISE_MAX = 12

const plurale = (n: number, uno: string, tanti: string) => (n === 1 ? `1 ${uno}` : `${n} ${tanti}`)
const rise = (i: number) => ({ '--rise-i': Math.min(i, RISE_MAX) }) as CSSProperties

/** «1° · Gold» → «Gold»: il tabellone, che la medaglia non mostra. */
const tabellone = (badge: string) => placementText(badge).split(' · ')[1] ?? ''

/**
 * «14 tornei · 7 podi · miglior piazzamento 1°» (il redesign). I primi due
 * pezzi sono quelli di sempre (difetto #1: le righe visibili); il terzo esce
 * solo se c'è un risultato vero, non con soli tornei in corso.
 */
function sottotitoloLista(cards: TorneoCard[]): string {
  const base = sottotitoloTornei(cards)
  const primo = (c: TorneoCard) => placementText(c.badge).split(' · ')[0]
  const classificati = cards.filter((c) => placementRank(primo(c)) < 9)
  if (!classificati.length) return base
  const migliore = classificati.reduce((a, b) => (placementRank(primo(b)) < placementRank(primo(a)) ? b : a))
  return `${base} · miglior piazzamento ${primo(migliore)}`
}

export default function Tornei({ vista, q, onVista, onQuery, list, entries, mappa, stagione, onNuovoTorneo, onStoria, traccia }: TorneiProps) {
  // ------------------------------------------------------------ ricerca
  const [testo, setTesto] = useState(q)
  const inviato = useRef(q)
  const campo = useRef<HTMLInputElement>(null)

  // Il testo arriva anche da fuori (indietro, link con ?q=): si riallinea.
  useEffect(() => {
    if (q !== inviato.current) {
      inviato.current = q
      setTesto(q)
    }
  }, [q])
  useEffect(() => {
    if (testo === inviato.current) return
    const t = window.setTimeout(() => {
      inviato.current = testo
      onQuery(testo)
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [testo, onQuery])

  // «/» porta nel campo di ricerca (desktop, Q13).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return
      const t = e.target as HTMLElement | null
      if (t && (t.closest('input, textarea, select, [contenteditable="true"]') || t.closest('[role="dialog"], [role="alertdialog"]'))) return
      e.preventDefault()
      campo.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const ricerca = deriveDiarySearch(entries, testo)
  const termine = testo.trim()

  // ------------------------------------------------------------ filtro
  // I prossimi si calcolano su tutto (le chip non li toccano); il filtro per
  // formato lavora sull'archivio. Le regole — quali chip, un filtro non più
  // valido che ricade su "Tutti" — restano quelle di `deriveTorneiSections`.
  // Quando il formato sparisce dai dati il valore salvato si azzera, così non
  // si riattiva da solo se quel formato ritorna (difetto #2).
  const [formato, setFormato] = useState<string>(TORNEI_FILTER_ALL)
  const prossimi = deriveTorneiSections(list.tornei).upcoming
  const archivio = list.tornei.filter((t) => !prossimi.includes(t))
  const sezioni = deriveTorneiSections(archivio, formato)
  useEffect(() => {
    if (formato !== TORNEI_FILTER_ALL && sezioni.active !== formato) setFormato(TORNEI_FILTER_ALL)
  }, [formato, sezioni.active])
  // «2vs2 · 12»: quanti tornei dell'archivio ha ogni chip.
  const perFormato = (f: string) => archivio.filter((t) => t.format === f).length

  const vuoto = list.tornei.length === 0 && entries.length === 0
  const visibili: TorneoCard[] = [...prossimi, ...sezioni.groups.flatMap((g) => g.tornei)]

  const sottotitolo = vuoto
    ? undefined
    : ricerca.active
      ? ricerca.results.length === 0
        ? `Nessun risultato per «${termine}»`
        : `${plurale(ricerca.results.length, 'risultato', 'risultati')} per «${termine}»`
      : sottotitoloLista(vista === 'mappa' ? list.tornei : visibili)

  const lente = (visibile: boolean) => (
    <IconButton
      icon="search"
      label="Cerca"
      className="tornei-lens"
      data-visible={visibile ? '' : undefined}
      tabIndex={visibile ? 0 : -1}
      aria-hidden={visibile ? undefined : true}
      onClick={() => {
        // I tasti battuti finiscono nel campo mentre la pagina sale (MOTION.md §4.1).
        campo.current?.focus({ preventScroll: true })
        scrollToTop(true)
      }}
    />
  )

  // L'indice di salita dei blocchi della Lista: dopo ricerca (1) e segmented (2).
  let blocco = 3

  return (
    <Page>
      <NavBar title="Tornei" subtitle={sottotitolo} subtitleLive scrolledActions={vuoto ? undefined : lente}>
        {!vuoto && (
          <div className="tornei-search rise" style={rise(1)}>
            <SearchField
              ref={campo}
              label="Cerca nei tornei"
              placeholder="Cerca torneo, città, compagno"
              value={testo}
              onChange={setTesto}
            />
          </div>
        )}
      </NavBar>

      {vuoto ? (
        <EmptyState
          variant="primo"
          zero="Tornei"
          title="Nessun torneo ancora."
          action={<Button onClick={onNuovoTorneo}>Crea il primo torneo</Button>}
          secondary={
            <>
              Preferisci farti guidare?{' '}
              <Link to={{ name: 'crea' }} className="tornei-link">Usa l'assistente</Link>
            </>
          }
        />
      ) : ricerca.active ? (
        ricerca.results.length === 0 ? (
          <EmptyState
            icon="search"
            title={`Nessun torneo contiene «${termine}».`}
            action={
              <Button
                variant="glass"
                onClick={() => {
                  setTesto('')
                  campo.current?.focus()
                }}
              >
                Cancella la ricerca
              </Button>
            }
          />
        ) : (
          <Risultati results={ricerca.results} onStoria={onStoria} traccia={traccia} />
        )
      ) : (
        <>
          <SegmentedControl
            className="tornei-segmented rise"
            label="Come vedere i tornei"
            value={vista}
            onChange={(v) => onVista(v as TorneiVista)}
            options={[
              { value: 'lista', label: 'Lista' },
              { value: 'mappa', label: mappa.citta ? `Mappa · ${mappa.citta} città` : 'Mappa' },
            ]}
          />

          {vista === 'mappa' ? (
            <Mappa m={mappa} stagione={stagione} onNuovoTorneo={onNuovoTorneo} />
          ) : (
            <>
              <Gruppo titolo="Prossimi tornei" tornei={prossimi} conFormato traccia={traccia} i={blocco++}>
                {prossimi.length === 0 && <ProssimiVuoto onNuovoTorneo={onNuovoTorneo} />}
              </Gruppo>
              {sezioni.options.length > 0 && (
                <div className="tornei-chips rise" style={rise(blocco++)}>
                  <FilterChips
                    label="Filtra i tornei per formato"
                    value={sezioni.active}
                    onChange={setFormato}
                    options={[
                      { value: TORNEI_FILTER_ALL, label: 'Tutti' },
                      ...sezioni.options.map((f) => ({ value: f, label: `${f} · ${perFormato(f)}` })),
                    ]}
                  />
                </div>
              )}
              {sezioni.groups.map((g) => (
                <Gruppo key={g.key} titolo={g.label} tornei={g.tornei} formato={g.key} traccia={traccia} i={blocco++} />
              ))}
            </>
          )}
        </>
      )}
    </Page>
  )
}

function Risultati(props: Parameters<typeof Timeline>[0]) {
  return (
    <LazyBoundary onReset={Timeline.reset}>
      <Suspense fallback={<RisultatiSkeleton />}>
        <Timeline {...props} rise={false} />
      </Suspense>
    </LazyBoundary>
  )
}

/** Lo skeleton dei risultati: le misure della voce del Diario (MOTION.md §6.3). */
function RisultatiSkeleton() {
  return (
    <Skeleton className="tornei-skel" label="Carico i risultati…">
      {[0, 1, 2].map((i) => (
        <div key={i} className="tornei-skel-entry">
          <Bone className="tornei-skel-day" />
          <Bone className="tornei-skel-card" />
        </div>
      ))}
    </Skeleton>
  )
}

// ---------------------------------------------------------------- gruppo
// Titolo a sinistra, «3 tornei» a destra: il contatore sta DENTRO l'h2, così
// finisce nel nome annunciato («2vs2, 3 tornei»). Senza tornei (solo i
// prossimi) il contatore non c'è: parla il riquadro vuoto.
function Gruppo({ titolo, tornei, formato, conFormato = false, traccia, i, children }: {
  titolo: string
  tornei: TorneoCard[]
  /** Il formato del gruppo: le sue righe non lo ripetono nella meta. */
  formato?: string
  /** I prossimi non sono raggruppati per formato: la meta lo tiene. */
  conFormato?: boolean
  traccia?: string
  i: number
  children?: ReactNode
}) {
  const id = useId()
  return (
    <section className="tornei-group rise" style={rise(i)} aria-labelledby={id}>
      <h2 className="tornei-group-title" id={id}>
        <span>{titolo}</span>
        {tornei.length > 0 && (
          <>
            {' '}
            <span className="tornei-group-count">{plurale(tornei.length, 'torneo', 'tornei')}</span>
          </>
        )}
      </h2>
      {tornei.length > 0 ? (
        <ul className="tornei-rows">
          {tornei.map((t) => (
            <RigaTorneo key={t.id} t={t} formato={conFormato ? undefined : formato} traccia={traccia === t.id} />
          ))}
        </ul>
      ) : (
        children
      )}
    </section>
  )
}

/** Il riquadro dei prossimi quando non ce n'è nessuno (il redesign). */
function ProssimiVuoto({ onNuovoTorneo }: { onNuovoTorneo: () => void }) {
  return (
    <div className="tornei-next-empty">
      <span className="tornei-next-icon" aria-hidden="true">
        <Icon name="calendar" size={20} />
      </span>
      <p className="tornei-next-text">Nessun torneo in programma: quando ne aggiungi uno, compare qui in cima.</p>
      <Button variant="glass" size="sm" aria-label="Aggiungi un torneo" onClick={onNuovoTorneo}>
        Aggiungi
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------- riga
// Il nome è un link vero, allargato a tutta la riga da uno pseudo-elemento:
// una fermata di Tab per torneo, il resto della riga resta leggibile e al
// focus si sente la meta (`aria-describedby`). Il piazzamento lo dice la
// medaglia (con il nome intero per gli screen reader); il tabellone e
// «Condiviso» stanno accanto al nome, in piccolo.
function RigaTorneo({ t, formato, traccia }: { t: TorneoCard; formato?: string; traccia: boolean }) {
  const meta = useId()
  // «28 giu · Cervia · Amatoriale · con Luca» (il redesign): la meta della lib
  // (data · luogo · formato · compagno, condivisa con la Home) più la
  // categoria, che prima stava nell'occhiello della card. Il formato sta già
  // nell'intestazione del gruppo: lì la riga non lo ripete.
  const parti = t.meta.split(' · ')
  const con = parti.filter((p) => p.startsWith('con '))
  const testoMeta = [...parti.filter((p) => !p.startsWith('con ') && p !== t.format), t.category, formato ? '' : t.format, ...con]
    .filter(Boolean)
    .join(' · ')
  const girone = tabellone(t.badge)
  const [vinte, perse] = t.record.split('-')
  return (
    <li className="tornei-row">
      {traccia && <span className="traccia" aria-hidden="true" />}
      <Medal placement={t.badge} size="md" />
      <div className="tornei-row-text">
        <p className="tornei-row-name">
          <Link to={{ name: 'torneo', id: t.id }} className="tornei-row-link" aria-describedby={meta}>
            {nomeVisibile(t.name)}
          </Link>
          {girone && <Badge>{girone}</Badge>}
          {t.shared && <Badge>Condiviso</Badge>}
        </p>
        <p id={meta} className="tornei-row-meta">{testoMeta}</p>
      </div>
      {t.matchCount > 0 && (
        <span className="tornei-row-record">
          <span aria-hidden="true">{vinte}–{perse}</span>
          <span className="sr-only">{`record ${vinte} a ${perse}`}</span>
        </span>
      )}
      <Icon name="chevron-right" size={16} className="tornei-row-chev" />
    </li>
  )
}
