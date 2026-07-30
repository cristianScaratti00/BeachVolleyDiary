import { useEffect, useState } from 'react'
import type { WrappedSlide } from '../../lib/derive'
import type { WrappedPalette } from './palette'

// ============================================================================
// Card di una singola slide del Beach Wrapped: nodo fisso 1080×1920 catturato
// da html-to-image (come StoryModal). Puramente presentazionale — riceve la
// slide già pronta da deriveWrapped, la palette (ruotata per indice) e, per le
// slide con copertina, la foto già inlinata come data-URL dal modale.
//
// Misure in px "veri" a 1080px: il modale scala l'intero nodo per l'anteprima,
// quindi qui NON si usano rem/vw — solo px, così l'export a 1080 è pixel-perfect.
// ============================================================================

// Dimensione dell'headline: base per lunghezza del testo, così un nome o
// un'etichetta lunga ("QUARTI DI FINALE") non esce dalla card a larghezza fissa.
function headlineSize(text: string): number {
  const len = text.trim().length
  if (len <= 3) return 300
  if (len <= 6) return 236
  if (len <= 10) return 176
  if (len <= 16) return 130
  if (len <= 24) return 96
  return 76
}

// Larghezza utile del contenuto: 1080 meno i 92px di padding per lato.
const CONTENT_W = 1080 - 92 * 2

// Foto di copertina (intro/podio). Il contenitore segue l'aspetto REALE della
// foto — non una banda fissa ultra-larga — così una foto verticale da telefono
// non finisce ritagliata in una striscia zoomata. L'aspetto è limitato a un
// intervallo ragionevole (da 3:4 verticale a 7:5 orizzontale) e l'altezza a
// [520, 940]px, così la card resta bilanciata qualunque sia la sorgente.
function WrappedPhoto({ src }: { src: string }) {
  const [ar, setAr] = useState<number | null>(null)
  useEffect(() => {
    let alive = true
    const im = new Image()
    im.onload = () => { if (alive) setAr(im.naturalWidth / im.naturalHeight || null) }
    im.src = src
    return () => { alive = false }
  }, [src])

  const aspect = Math.min(1.4, Math.max(0.75, ar ?? 4 / 3))
  const height = Math.round(Math.min(880, Math.max(520, CONTENT_W / aspect)))
  return (
    <div style={{ width: '100%', height }}>
      <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 40, display: 'block' }} />
    </div>
  )
}

// `compact` serve alla slide di riepilogo: sei celle invece di due o tre non
// entrerebbero in altezza alla misura piena.
function StatCell({ stat, pal, compact = false }: { stat: { value: string; label: string }; pal: WrappedPalette; compact?: boolean }) {
  return (
    <div style={{ background: pal.bg, padding: compact ? '32px 36px' : '44px 48px' }}>
      <div className="num" style={{ fontSize: compact ? 68 : 84, lineHeight: 1, color: pal.fg }}>{stat.value}</div>
      <div style={{ font: `700 ${compact ? 21 : 24}px 'Nunito Sans'`, letterSpacing: 2, textTransform: 'uppercase', color: pal.muted, marginTop: compact ? 10 : 14 }}>{stat.label}</div>
    </div>
  )
}

interface WrappedSlideCardProps {
  slide: WrappedSlide
  pal: WrappedPalette
  index: number
  total: number
  photoSrc?: string | null // foto già inlinata (data-URL); assente → visual emoji
}

export default function WrappedSlideCard({ slide, pal, index, total, photoSrc }: WrappedSlideCardProps) {
  // Il riepilogo è la card-manifesto di fine mazzo: centrata come intro e outro,
  // griglia fissa a due colonne e celle compatte per far stare sei numeri.
  const recap = slide.kind === 'recap'
  const centered = slide.kind === 'intro' || slide.kind === 'outro' || recap
  const hasStats = slide.stats.length > 0
  const cols = recap ? 2 : slide.stats.length === 4 ? 2 : slide.stats.length
  const num = (n: number) => String(n).padStart(2, '0')

  return (
    <div
      style={{
        position: 'absolute', top: 0, left: 0, width: 1080, height: 1920,
        background: pal.bg, color: pal.fg,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '96px 92px', fontFamily: "'Nunito Sans',sans-serif",
      }}
    >
      {/* header: marchio a sinistra, contatore slide a destra */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: pal.accent }} />
          <div style={{ font: "600 34px 'Space Grotesk'", letterSpacing: 2 }}>BEACH DIARY</div>
        </div>
        <div className="num" style={{ fontSize: 32, color: pal.muted, letterSpacing: 2 }}>{num(index + 1)} / {num(total)}</div>
      </div>

      {/* hero */}
      <div
        style={{
          flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center',
          gap: 30, padding: '48px 0',
          alignItems: centered ? 'center' : 'flex-start',
          textAlign: centered ? 'center' : 'left',
        }}
      >
        {photoSrc ? (
          <WrappedPhoto src={photoSrc} />
        ) : (
          // Sul riepilogo l'emoji si fa da parte: lo spazio serve alle sei celle.
          <div style={{ fontSize: recap ? 96 : 150, lineHeight: 1 }}>{slide.emoji}</div>
        )}

        <div style={{ font: "700 34px 'Nunito Sans'", letterSpacing: 6, textTransform: 'uppercase', color: pal.accent }}>{slide.eyebrow}</div>

        <div
          className="num"
          style={{ fontSize: headlineSize(slide.headline), fontWeight: 500, lineHeight: 1.04, letterSpacing: -2, color: pal.fg, overflowWrap: 'anywhere' }}
        >
          {slide.headline}
        </div>

        {slide.title && <div style={{ font: "600 42px 'Nunito Sans'", color: pal.fg, overflowWrap: 'anywhere' }}>{slide.title}</div>}
        {slide.caption && <div style={{ font: "600 32px 'Nunito Sans'", color: pal.muted, overflowWrap: 'anywhere' }}>{slide.caption}</div>}

        {hasStats && (
          <div
            style={{
              width: '100%', marginTop: 14,
              display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 2,
              background: pal.line, border: `1px solid ${pal.line}`, borderRadius: 28, overflow: 'hidden',
            }}
          >
            {slide.stats.map((st, i) => <StatCell key={i} stat={st} pal={pal} compact={recap} />)}
          </div>
        )}
      </div>

      {/* footer */}
      <div style={{ font: "700 28px 'Nunito Sans'", letterSpacing: 4, textTransform: 'uppercase', color: pal.muted, flex: 'none' }}>
        Il mio diario · Beach Volley
      </div>
    </div>
  )
}
