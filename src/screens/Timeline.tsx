// ============================================================================
// Le voci del Diario (il redesign, UX §5 F4, §6.3), dalla più recente, sotto
// l'intestazione del loro mese. È anche la forma dei risultati della ricerca
// (in Diario e in Tornei), che portano sotto la voce le partite che
// rispondono (il "perché").
//
// Una voce: la colonna del giorno («14 / gio») e la card del torneo. La card è
// un `<article>` con il titolo-link esteso a tutta la card (UX §7.6): una
// fermata di Tab per voce, il contenuto resta leggibile. [Storia] è un
// pulsante fratello del link, sopra l'area estesa; la Storia si può fare anche
// sui tornei condivisi (Q4).
//
// Le intestazioni dei mesi sono h2 (fra l'h1 della schermata e gli h3 delle
// card): niente h2 nascosto per l'heading-order.
// Caricata in lazy da Diario.tsx e Tornei.tsx.
// ============================================================================
import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { DiaryEntry, DiaryPhotoThumb, DiarySearchResult } from '../lib/derive'
import { Badge, Button, Card, CardAbove, CardLink, Icon, List, MatchRow, placementText } from '../components/ui/index'
import { Medal } from '../components/ui/Medal'
import './Timeline.css'

/** Oltre queste voci non si monta tutto: [Mostra altri 60] (UX §6.3, PUÒ). */
const PAGINA = 60

/** Solo i primi blocchi salgono uno dopo l'altro: oltre, niente sfalsamento. */
const RISE_MAX = 12

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']
const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato']

/** 'Giu' → 5. Il mese della voce arriva abbreviato (`MONTHS_SHORT` della lib). */
const meseDi = (e: DiaryEntry) => MESI.findIndex((m) => m.startsWith(e.month.toLowerCase().slice(0, 3)))

/** «gio»/«giovedì», o niente se la data non si ricostruisce. Le date sono senza ora: in UTC. */
function giornoDellaSettimana(e: DiaryEntry): string {
  const m = meseDi(e)
  const d = new Date(Date.UTC(Number(e.year), m, Number(e.day)))
  return m < 0 || Number.isNaN(d.getTime()) ? '' : GIORNI[d.getUTCDay()]
}

const maiuscola = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export interface TimelineProps {
  results: DiarySearchResult[]
  onStoria: (tournamentId: string) => void
  /** Id della voce appena toccata: porta la traccia. */
  traccia?: string
  /** Le voci salgono all'arrivo (il Diario); i risultati di una ricerca no. */
  rise?: boolean
  /** La riga sotto il titolo («Rimini · Amatoriale · 2° · con Luca»); senza,
   *  il recap della lib. */
  meta?: (tournamentId: string) => string | undefined
}

interface Mese {
  key: string
  label: string
  voci: { r: DiarySearchResult; i: number }[]
}

/** Le voci consecutive dello stesso mese stanno sotto la stessa intestazione. */
function perMese(results: DiarySearchResult[]): Mese[] {
  const mesi: Mese[] = []
  results.forEach((r, i) => {
    const e = r.entry
    const key = `${e.year}-${e.month}`
    const ultimo = mesi[mesi.length - 1]
    if (ultimo?.key === key) ultimo.voci.push({ r, i })
    else {
      const m = meseDi(e)
      mesi.push({ key, label: `${m < 0 ? e.month : maiuscola(MESI[m])} ${e.year}`, voci: [{ r, i }] })
    }
  })
  return mesi
}

export default function Timeline({ results, onStoria, traccia, rise = true, meta }: TimelineProps) {
  const [quante, setQuante] = useState(PAGINA)
  const lista = useRef<HTMLDivElement>(null)
  const primaNuova = useRef<number | null>(null)

  // Le voci nuove compaiono senza animazione; il focus va al link della prima
  // (MOTION.md §5 F4).
  useEffect(() => {
    const i = primaNuova.current
    if (i == null) return
    primaNuova.current = null
    lista.current?.querySelectorAll<HTMLAnchorElement>('.ui-card-link')[i]?.focus()
  }, [quante])

  const visibili = results.slice(0, quante)
  const resto = results.length - visibili.length

  // L'indice di salita conta intestazioni e voci, nell'ordine in cui si vedono.
  let passo = 2
  const sale = (): { className?: string; style?: CSSProperties } => {
    const i = passo++
    return rise && i <= RISE_MAX ? { className: 'rise', style: { '--rise-i': i } as CSSProperties } : {}
  }

  return (
    <div ref={lista} className="timeline">
      {perMese(visibili).map((m) => {
        const titolo = sale()
        return (
          <section key={m.key} className="timeline-month">
            <h2 className={`timeline-month-title ${titolo.className ?? ''}`} style={titolo.style}>{m.label}</h2>
            <ul className="timeline-list">
              {m.voci.map(({ r }) => (
                <Voce key={r.entry.id} r={r} onStoria={onStoria} traccia={traccia === r.entry.id} meta={meta?.(r.entry.id)} {...sale()} />
              ))}
            </ul>
          </section>
        )
      })}
      {resto > 0 && (
        <div className="timeline-more">
          <Button
            variant="glass"
            onClick={() => {
              primaNuova.current = quante
              setQuante((n) => n + PAGINA)
            }}
          >
            Mostra altri {Math.min(PAGINA, resto)}
          </Button>
        </div>
      )}
    </div>
  )
}

function Voce({ r, onStoria, traccia, meta, className, style }: {
  r: DiarySearchResult
  onStoria: (id: string) => void
  traccia: boolean
  meta?: string
  className?: string
  style?: CSSProperties
}) {
  const e = r.entry
  const desc = useId()
  const giorno = giornoDellaSettimana(e)
  const meseIdx = meseDi(e)
  // Il tabellone («1° · Gold») non sta nella medaglia: chiude la riga del recap.
  const girone = placementText(e.badge).split(' · ')[1]
  // Il recap della lib ha il piazzamento grezzo («Chiuso al 1° 🏆»): il trofeo
  // esce (C15), lo screen reader non legge l'emoji.
  const recap = meta || placementText(e.desc) + (girone ? ` · tabellone ${girone}` : '')
  // La nota in corsivo: l'ultima scritta su una partita del torneo. Con una
  // ricerca che porta le partite, la nota sta già nella loro riga.
  const nota = r.hits.length ? '' : [...e.matches].reverse().find((m) => m.note.trim())?.note.trim() ?? ''
  const foto = e.photos.length + e.morePhotos

  return (
    <li className={className ? `timeline-entry ${className}` : 'timeline-entry'} style={style}>
      <p className="timeline-day">
        <span aria-hidden="true">
          <b>{Number(e.day) || e.day}</b>
          {giorno && <span>{giorno.slice(0, 3)}</span>}
        </span>
        <span className="sr-only">{[giorno, Number(e.day) || e.day, meseIdx < 0 ? e.month : MESI[meseIdx]].filter(Boolean).join(' ')}</span>
      </p>
      <Card traccia={traccia} className="timeline-card">
        <div className="timeline-head">
          <div className="timeline-titles">
            <CardLink to={{ name: 'torneo', id: e.id }} describedBy={desc} className="timeline-title">
              {e.title}
            </CardLink>
            <p id={desc} className="timeline-desc">{recap}</p>
          </div>
          <Medal placement={e.badge} size="sm" />
        </div>

        {/* Il perché del riscontro: le partite che rispondono alla ricerca.
            Sono contesto, non controlli: si apre il torneo dal titolo. */}
        {r.hits.length > 0 && (
          <List className="timeline-hits" label={`Partite trovate in ${e.title}`}>
            {r.hits.map((m) => (
              <MatchRow
                key={m.id}
                readOnly
                esitoShort={m.esitoShort}
                esitoColor={m.esitoColor}
                title={`vs ${m.opponents}`}
                detail={m.phase}
                sets={m.setChips}
                note={m.note || undefined}
              />
            ))}
          </List>
        )}

        {e.photos.length > 0 && (
          <div className="timeline-thumbs">
            {e.photos.map((ph, i) => (
              <Scatto key={i} ph={ph} />
            ))}
            {e.morePhotos > 0 && <Badge>+{e.morePhotos}</Badge>}
          </div>
        )}

        {nota && <p className="timeline-note">“{nota}”</p>}

        <div className="timeline-foot">
          {foto > 0 && <span className="timeline-count">{foto === 1 ? '1 foto' : `${foto} foto`}</span>}
          <CardAbove className="timeline-actions">
            <Button variant="glass" size="sm" icon="instagram" aria-label={`Storia Instagram di ${e.title}`} onClick={() => onStoria(e.id)}>
              Storia
            </Button>
          </CardAbove>
        </div>
      </Card>
    </li>
  )
}

function Scatto({ ph }: { ph: DiaryPhotoThumb }) {
  if (ph.url) {
    return (
      <span className="timeline-thumb">
        <img src={ph.url} alt={ph.caption} loading="lazy" />
      </span>
    )
  }
  // Foto legacy senza immagine: il riquadro dell'etichetta colore, che è
  // contenuto dell'utente (ART_DIRECTION §4.3.7), con la macchina fotografica.
  return (
    <span
      className="timeline-thumb timeline-photo-missing"
      role="img"
      aria-label="Foto non disponibile"
      style={{ '--c': ph.color } as CSSProperties}
    >
      <Icon name="camera" size={16} />
    </span>
  )
}
