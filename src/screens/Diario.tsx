// ============================================================================
// Diario (il redesign): la tab che racconta la stagione, dal torneo più
// recente, mese per mese. È la Timeline che prima stava dentro Tornei, con la
// sua ricerca — per nome, città, avversario, nota o didascalia — che porta
// sotto la voce le partite che rispondono.
//
// Il testo della ricerca vive qui (i risultati cambiano nello stesso
// fotogramma del tasto) e sale all'URL (`?q=`, in replace) dopo 250ms, come in
// Tornei; «/» porta nel campo. Il sottotitolo è l'unica live region della
// schermata.
// ============================================================================
import { Suspense, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { deriveDiarySearch } from '../lib/derive'
import type { DiarioProps } from '../app/contracts'
import { LazyBoundary, lazyRetry } from '../app/LazyBoundary'
import { Bone, Button, EmptyState, NavBar, Page, SearchField, Skeleton } from '../components/ui/index'
import './Diario.css'

const Timeline = lazyRetry(() => import('./Timeline'))

/** Quanto aspetta la ricerca prima di scrivere `?q=` nell'URL (UX §4.2). */
const DEBOUNCE_MS = 250

const plurale = (n: number, uno: string, tanti: string) => (n === 1 ? `1 ${uno}` : `${n} ${tanti}`)

export default function Diario({ q, onQuery, entries, meta, onNuovoTorneo, onStoria, traccia }: DiarioProps) {
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

  // «/» porta nel campo di ricerca (desktop, Q13), come in Tornei.
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
  const vuoto = entries.length === 0

  const sottotitolo = vuoto
    ? 'La tua stagione, torneo dopo torneo'
    : ricerca.active
      ? ricerca.results.length === 0
        ? `Nessun risultato per «${termine}»`
        : `${plurale(ricerca.results.length, 'risultato', 'risultati')} per «${termine}»`
      : `${plurale(entries.length, 'torneo', 'tornei')}, dal più recente`

  return (
    <Page width="timeline">
      <NavBar title="Diario" subtitle={sottotitolo} subtitleLive>
        {!vuoto && (
          <div className="diario-search rise" style={{ '--rise-i': 1 } as CSSProperties}>
            <SearchField
              ref={campo}
              label="Cerca nel diario"
              placeholder="Cerca un torneo, una città, un avversario…"
              value={testo}
              onChange={setTesto}
            />
          </div>
        )}
      </NavBar>

      {vuoto ? (
        <EmptyState
          variant="primo"
          zero="Diario"
          title="Il diario è ancora bianco."
          text="Ogni torneo che registri diventa una pagina, con le partite, le foto e la sua storia."
          action={<Button onClick={onNuovoTorneo}>Registra il primo torneo</Button>}
        />
      ) : ricerca.active && ricerca.results.length === 0 ? (
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
        <LazyBoundary onReset={Timeline.reset}>
          <Suspense fallback={<DiarioSkeleton />}>
            <Timeline results={ricerca.results} onStoria={onStoria} traccia={traccia} rise={!ricerca.active} meta={meta} />
          </Suspense>
        </LazyBoundary>
      )}
    </Page>
  )
}

/** Lo skeleton del Diario: le stesse misure della voce vera (MOTION.md §6.3). */
function DiarioSkeleton() {
  return (
    <Skeleton className="diario-skel" label="Carico il diario…">
      <Bone className="diario-skel-month" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="diario-skel-entry">
          <Bone className="diario-skel-day" />
          <Bone className="diario-skel-card" />
        </div>
      ))}
    </Skeleton>
  )
}
