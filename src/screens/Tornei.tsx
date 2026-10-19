// ============================================================================
// Tornei (UX §5 F4, §6.3): l'archivio, con tre viste degli stessi tornei —
// Lista · Timeline (l'ex Diario) · Mappa — sotto UNA ricerca.
//
// - Il sottotitolo descrive ciò che si vede ed è l'unica live region della
//   schermata (`role="status"`): sulla Lista conta le card visibili col
//   formato attivo (difetto #1), in Timeline le voci del diario, con la
//   ricerca i risultati.
// - La ricerca vale per tutte le viste: con un testo, segmented e chip
//   spariscono e al loro posto ci sono i risultati, stile Timeline. Il testo
//   vive qui (i risultati cambiano nello stesso fotogramma del tasto) e sale
//   all'URL (`?q=`, in replace) dopo 250ms.
// - Il cambio di vista dal segmented lascia il focus sul segmento (M4).
// - Niente "Nuovo torneo" nell'intestazione: si crea dal ＋ e dalla Sidebar.
// ============================================================================
import { Suspense, useEffect, useId, useRef, useState } from 'react'
import { deriveDiarySearch, deriveTorneiSections, TORNEI_FILTER_ALL } from '../lib/derive'
import type { TorneoCard } from '../lib/derive'
import { mappaSubtitle } from '../lib/derive.mappa'
import type { TorneiProps } from '../app/contracts'
import type { TorneiVista } from '../app/routes'
import { Link, scrollToTop } from '../app/router'
import { LazyBoundary, lazyRetry } from '../app/LazyBoundary'
import { sottotitoloTornei } from '../app/selectors'
import {
  Badge,
  Bone,
  Button,
  Card,
  CardGrid,
  CardLink,
  EmptyState,
  FilterChips,
  IconButton,
  NavBar,
  Page,
  PlacementBadge,
  SearchField,
  Section,
  SegmentedControl,
  Skeleton,
  StatFooter,
} from '../components/ui/index'
import Mappa from './Mappa'
import './Tornei.css'

// La Timeline (e i risultati della ricerca, che hanno la sua forma) sta in un
// chunk a parte, come il Diario di prima.
const Timeline = lazyRetry(() => import('./Timeline'))

/** Quanto aspetta la ricerca prima di scrivere `?q=` nell'URL (UX §4.2). */
const DEBOUNCE_MS = 250

const plurale = (n: number, uno: string, tanti: string) => (n === 1 ? `1 ${uno}` : `${n} ${tanti}`)

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
  // Il filtro per formato è di presentazione: vive qui. Quando il formato
  // sparisce dai dati si torna a "Tutti" e il valore salvato si azzera, così
  // non si riattiva da solo se quel formato ritorna (difetto #2).
  const [formato, setFormato] = useState<string>(TORNEI_FILTER_ALL)
  const sezioni = deriveTorneiSections(list.tornei, formato)
  useEffect(() => {
    if (formato !== TORNEI_FILTER_ALL && sezioni.active !== formato) setFormato(TORNEI_FILTER_ALL)
  }, [formato, sezioni.active])

  const vuoto = list.tornei.length === 0 && entries.length === 0
  const visibili: TorneoCard[] = [...sezioni.upcoming, ...sezioni.groups.flatMap((g) => g.tornei)]

  const sottotitolo = vuoto
    ? undefined
    : ricerca.active
      ? ricerca.results.length === 0
        ? `Nessun risultato per «${termine}»`
        : `${plurale(ricerca.results.length, 'risultato', 'risultati')} per «${termine}»`
      : vista === 'timeline'
        ? `${plurale(entries.length, 'torneo', 'tornei')} nel diario`
        : vista === 'mappa'
          ? mappaSubtitle(mappa)
          : sottotitoloTornei(visibili)

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

  return (
    <Page>
      <NavBar title="Tornei" subtitle={sottotitolo} subtitleLive scrolledActions={vuoto ? undefined : lente}>
        {!vuoto && (
          <SearchField
            ref={campo}
            className="tornei-search"
            label="Cerca nei tornei"
            placeholder="Cerca un torneo, una città, un avversario…"
            value={testo}
            onChange={setTesto}
          />
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
                variant="tinted"
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
          <TimelineArea results={ricerca.results} onStoria={onStoria} traccia={traccia} />
        )
      ) : (
        <>
          <SegmentedControl
            className="tornei-segmented"
            label="Come vedere i tornei"
            value={vista}
            onChange={(v) => onVista(v as TorneiVista)}
            options={[
              { value: 'lista', label: 'Lista' },
              { value: 'timeline', label: 'Timeline' },
              { value: 'mappa', label: mappa.citta ? `Mappa · ${mappa.citta}` : 'Mappa' },
            ]}
          />

          {vista === 'mappa' ? (
            <Mappa m={mappa} stagione={stagione} onNuovoTorneo={onNuovoTorneo} />
          ) : vista === 'timeline' ? (
            <TimelineArea results={ricerca.results} onStoria={onStoria} traccia={traccia} />
          ) : (
            <>
              {sezioni.options.length > 0 && (
                <FilterChips
                  className="tornei-chips"
                  label="Filtra i tornei per formato"
                  value={sezioni.active}
                  onChange={setFormato}
                  options={[{ value: TORNEI_FILTER_ALL, label: 'Tutti' }, ...sezioni.options.map((f) => ({ value: f, label: f }))]}
                />
              )}
              {sezioni.upcoming.length > 0 && (
                <SezioneTornei titolo="Prossimi tornei" tornei={sezioni.upcoming} accent traccia={traccia} />
              )}
              {sezioni.groups.map((g) => (
                <SezioneTornei key={g.key} titolo={g.label} tornei={g.tornei} traccia={traccia} />
              ))}
            </>
          )}
        </>
      )}
    </Page>
  )
}

function TimelineArea(props: Parameters<typeof Timeline>[0]) {
  return (
    <LazyBoundary onReset={Timeline.reset}>
      <Suspense fallback={<TimelineSkeleton />}>
        <Timeline {...props} />
      </Suspense>
    </LazyBoundary>
  )
}

/** Lo skeleton della Timeline: le stesse misure della voce vera (MOTION.md §6.3). */
function TimelineSkeleton() {
  return (
    <Skeleton className="tornei-skel" label="Carico la timeline…">
      {[0, 1, 2].map((i) => (
        <div key={i} className="tornei-skel-entry">
          <div className="tornei-skel-date">
            <Bone className="tornei-skel-day" />
            <Bone className="tornei-skel-month" />
          </div>
          <div className="tornei-skel-body">
            <Bone className="tornei-skel-title" />
            <Bone className="tornei-skel-meta" />
            {i % 2 === 0 && <Bone className="tornei-skel-cover" />}
          </div>
        </div>
      ))}
    </Skeleton>
  )
}

function SezioneTornei({ titolo, tornei, accent = false, traccia }: {
  titolo: string
  tornei: TorneoCard[]
  accent?: boolean
  traccia?: string
}) {
  const id = useId()
  return (
    <Section
      id={id}
      title={titolo}
      count={<Badge tone={accent ? 'accent' : 'neutral'}>{plurale(tornei.length, 'torneo', 'tornei')}</Badge>}
    >
      <CardGrid>
        {tornei.map((t) => (
          <CardTorneo key={t.id} t={t} traccia={traccia === t.id} />
        ))}
      </CardGrid>
    </Section>
  )
}

/** Card torneo: un `<article>` con il titolo-link esteso (UX §7.6). */
function CardTorneo({ t, traccia }: { t: TorneoCard; traccia: boolean }) {
  const meta = useId()
  return (
    <li className="tornei-item">
      <Card traccia={traccia} className="tornei-card">
        <div className="tornei-card-top">
          <span className="tornei-card-cat">
            {/* Il pallino è il letterale della lib: decorativo, accanto al testo. */}
            <span className="tornei-dot" style={{ background: t.dot }} aria-hidden="true" />
            <span className="tornei-eyebrow">{t.category}</span>
            {t.shared && <Badge>Condiviso</Badge>}
          </span>
          <PlacementBadge label={t.badge} libBg={t.badgeBg} />
        </div>
        <CardLink to={{ name: 'torneo', id: t.id }} describedBy={meta} className="tornei-card-title">
          {t.name}
        </CardLink>
        <p id={meta} className="tornei-meta">{t.meta}</p>
        <StatFooter
          items={[
            { value: t.record, label: 'record', tone: 'win' },
            { value: `${t.winPct}%`, label: 'vittorie' },
            { value: t.matchCount, label: 'partite' },
          ]}
        />
      </Card>
    </li>
  )
}
