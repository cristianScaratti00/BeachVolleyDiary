// ============================================================================
// Tornei · Timeline (l'ex Diario, UX §5 F4, §6.3): le voci in ordine di tempo,
// con il recap, le foto e la Storia. È anche la forma dei risultati della
// ricerca, che portano sotto la voce le partite che rispondono (il "perché").
//
// Ogni voce è un `<article>` con il titolo-link esteso a tutta la card (UX
// §7.6): una fermata di Tab per voce, il contenuto resta leggibile. [Storia
// Instagram] è un pulsante fratello del link, sopra l'area estesa; la Storia
// si può fare anche sui tornei condivisi (Q4).
// Caricata in lazy da Tornei.tsx, come il Diario di prima.
// ============================================================================
import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { DiaryEntry, DiaryPhotoThumb, DiarySearchResult } from '../lib/derive'
import { Badge, Button, Card, CardAbove, CardLink, Icon, List, MatchRow, PlacementBadge } from '../components/ui/index'
import './Timeline.css'

/** Oltre queste voci non si monta tutto: [Mostra altri 60] (UX §6.3, PUÒ). */
const PAGINA = 60

export interface TimelineProps {
  results: DiarySearchResult[]
  onStoria: (tournamentId: string) => void
  /** Id della voce appena toccata: porta la traccia. */
  traccia?: string
}

export default function Timeline({ results, onStoria, traccia }: TimelineProps) {
  const [quante, setQuante] = useState(PAGINA)
  const lista = useRef<HTMLUListElement>(null)
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

  return (
    <div className="timeline">
      {/* Fra il h1 «Tornei» e i h3 delle card ci vuole un h2 (axe heading-order). */}
      <h2 className="sr-only">Timeline</h2>
      <ul ref={lista} className="timeline-list">
        {visibili.map((r) => (
          <Voce key={r.entry.id} r={r} onStoria={onStoria} traccia={traccia === r.entry.id} />
        ))}
      </ul>
      {resto > 0 && (
        <div className="timeline-more">
          <Button
            variant="tinted"
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

function Voce({ r, onStoria, traccia }: { r: DiarySearchResult; onStoria: (id: string) => void; traccia: boolean }) {
  const e = r.entry
  const desc = useId()
  return (
    <li className="timeline-item">
      <Card traccia={traccia} className="timeline-entry">
        <div className="timeline-date">
          <span className="timeline-day">{e.day}</span>
          <span className="timeline-month">{e.month}</span>
          <span className="timeline-year">{e.year}</span>
          <span className="timeline-emoji" aria-hidden="true">{e.emoji}</span>
        </div>
        <div className="timeline-body">
          <div className="timeline-head">
            <CardLink to={{ name: 'torneo', id: e.id }} describedBy={desc} className="timeline-title">
              {e.title}
            </CardLink>
            <PlacementBadge label={e.badge} libBg={e.badgeBg} />
          </div>
          <p id={desc} className="timeline-desc">{e.desc}</p>

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

          {e.photos.length > 0 && <Foto entry={e} />}

          <CardAbove className="timeline-actions">
            <Button variant="tinted" size="sm" icon="share" onClick={() => onStoria(e.id)}>
              Storia Instagram
            </Button>
          </CardAbove>
        </div>
      </Card>
    </li>
  )
}

/** La prima foto è la copertina in 16:10, le altre miniature (ART_DIRECTION §10.3). */
function Foto({ entry }: { entry: DiaryEntry }) {
  const [copertina, ...altre] = entry.photos
  return (
    <div className="timeline-photos">
      <Scatto ph={copertina} className="timeline-cover" />
      {(altre.length > 0 || entry.morePhotos > 0) && (
        <div className="timeline-thumbs">
          {altre.map((ph, i) => (
            <Scatto key={i} ph={ph} className="timeline-thumb" />
          ))}
          {entry.morePhotos > 0 && <Badge>+{entry.morePhotos}</Badge>}
        </div>
      )}
    </div>
  )
}

function Scatto({ ph, className }: { ph: DiaryPhotoThumb; className: string }) {
  if (ph.url) {
    return (
      <span className={className}>
        <img src={ph.url} alt={ph.caption} loading="lazy" />
      </span>
    )
  }
  // Foto legacy senza immagine: il riquadro dell'etichetta colore, che è
  // contenuto dell'utente (ART_DIRECTION §4.3.7), con la macchina fotografica.
  return (
    <span
      className={`${className} timeline-photo-missing`}
      role="img"
      aria-label="Foto non disponibile"
      style={{ '--c': ph.color } as CSSProperties}
    >
      <Icon name="camera" size={20} />
    </span>
  )
}
