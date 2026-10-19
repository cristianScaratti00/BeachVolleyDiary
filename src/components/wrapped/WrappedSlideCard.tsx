// ============================================================================
// La TELA di una slide del Beach Wrapped (ART_DIRECTION §10.4): un nodo fisso
// 1080×1920 catturato da html-to-image. Grammatica da manifesto sportivo:
// campiture piatte, una griglia, numeri enormi.
//
// Regole della tela (diverse da quelle dell'interfaccia, di proposito):
// - colori LETTERALI e OPACHI dalla palette (`palette.ts`), niente custom
//   property: html-to-image non le porta nel PNG;
// - niente `backdrop-filter`, niente ombre, niente gradienti;
// - solo Inter, scritto come famiglia letterale: si incorpora e il recap esce
//   uguale su iPhone e su Android (il visore lo carica prima di `toPng`);
// - misure in px "veri" a 1080: il visore scala il nodo intero per l'anteprima;
// - zone sicure di Instagram: niente testo essenziale nei primi 250px e negli
//   ultimi 250px (avatar, risposta, sticker). Il marchio in fondo ci sta: è un
//   marchio, non un'informazione.
// ============================================================================
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { WrappedSlide } from '../../lib/derive'
import { BrandMark } from '../Logo'
import type { WrappedPalette } from './palette'

const W = 1080
const H = 1920
const MARGINE = 88
const ZONA_SICURA = 250
const FONT = 'Inter, Arial, sans-serif'

// Il "sole basso": un disco pieno tagliato dal bordo in alto a destra, dietro a
// tutto. Diametro 920, centro in (1200, −120).
const SOLE = 920
const SOLE_X = 1200
const SOLE_Y = -120

/** Un numero (o una stringa numerica breve): va in grande, nel colore d'accento. */
const NUMERICO = /^[\d.,%+–\-°/]+$/u

function tagliaNumero(t: string): number {
  const n = t.length
  if (n <= 3) return 320
  if (n <= 4) return 260
  return 210
}

/** L'headline di testo (un nome, «Stagione 2026», «Grazie»): mai sotto 88. */
function tagliaTitolo(t: string): number {
  const n = t.trim().length
  if (n <= 6) return 200
  if (n <= 10) return 150
  if (n <= 16) return 112
  return 88
}

const eyebrow = (pal: WrappedPalette): CSSProperties => ({
  font: `700 28px/36px ${FONT}`,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: pal.muted,
})

// Foto di copertina (intro, podio): segue l'aspetto reale fra 3:4 e 7:5,
// raggio 28 con il filo `line` da 2px. Mai sotto il testo.
function Foto({ src, pal }: { src: string; pal: WrappedPalette }) {
  const [ar, setAr] = useState<number | null>(null)
  useEffect(() => {
    let alive = true
    const im = new Image()
    im.onload = () => {
      if (alive) setAr(im.naturalWidth / im.naturalHeight || null)
    }
    im.src = src
    return () => {
      alive = false
    }
  }, [src])
  const aspect = Math.min(1.4, Math.max(0.75, ar ?? 4 / 3))
  const larghezza = W - MARGINE * 2
  const altezza = Math.round(Math.min(760, Math.max(440, larghezza / aspect)))
  return (
    <img
      src={src}
      alt=""
      style={{
        width: '100%',
        height: altezza,
        objectFit: 'cover',
        display: 'block',
        borderRadius: 28,
        border: `2px solid ${pal.line}`,
        boxSizing: 'border-box',
        flex: 'none',
      }}
    />
  )
}

// Le statistiche: celle separate da filetti `line` di 2px, non da riquadri.
function Celle({ stats, pal, compatte }: { stats: WrappedSlide['stats']; pal: WrappedPalette; compatte: boolean }) {
  const cols = stats.length === 1 ? 1 : 2
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, width: '100%', flex: 'none' }}>
      {stats.map((st, i) => {
        const riga = Math.floor(i / cols)
        const col = i % cols
        return (
          <div
            key={i}
            style={{
              borderTop: riga > 0 ? `2px solid ${pal.line}` : undefined,
              borderLeft: col > 0 ? `2px solid ${pal.line}` : undefined,
              padding: compatte ? '28px 32px' : '40px 40px',
              paddingLeft: col > 0 ? (compatte ? 32 : 40) : 0,
            }}
          >
            <div
              style={{
                font: `800 ${compatte ? 96 : 112}px/${compatte ? 96 : 112}px ${FONT}`,
                letterSpacing: '-0.04em',
                fontVariantNumeric: 'tabular-nums',
                color: pal.fg,
                whiteSpace: 'nowrap',
              }}
            >
              {st.value}
            </div>
            <div style={{ font: `700 26px/32px ${FONT}`, letterSpacing: '0.1em', textTransform: 'uppercase', color: pal.muted, marginTop: 12 }}>
              {st.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface WrappedSlideCardProps {
  slide: WrappedSlide
  pal: WrappedPalette
  index: number
  total: number
  /** La foto già inlinata come data-URL (assente → l'emoji della slide). */
  photoSrc?: string | null
}

export default function WrappedSlideCard({ slide, pal, index, total, photoSrc }: WrappedSlideCardProps) {
  const recap = slide.kind === 'recap'
  const headline = slide.headline.trim()
  const numerico = NUMERICO.test(headline) && headline.length <= 6
  const due = (n: number) => String(n).padStart(2, '0')

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: W,
        height: H,
        overflow: 'hidden',
        background: pal.bg,
        color: pal.fg,
        fontFamily: FONT,
      }}
    >
      {/* Il sole basso, dietro a tutto. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: SOLE,
          height: SOLE,
          left: SOLE_X - SOLE / 2,
          top: SOLE_Y - SOLE / 2,
          borderRadius: '50%',
          background: pal.disc,
        }}
      />

      {/* L'emoji della slide è contenuto, non interfaccia: sta nel sole, nella
          zona alta che Instagram copre (non porta informazioni). */}
      {!photoSrc && slide.emoji && (
        <div aria-hidden="true" style={{ position: 'absolute', right: MARGINE, top: 104, fontSize: 120, lineHeight: 1 }}>
          {slide.emoji}
        </div>
      )}

      {/* Il contenuto: dall'eyebrow a y = 264 fino al limite della zona sicura. */}
      <div
        style={{
          position: 'absolute',
          left: MARGINE,
          right: MARGINE,
          top: 264,
          bottom: ZONA_SICURA,
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
        }}
      >
        <div style={eyebrow(pal)}>{slide.eyebrow}</div>

        {numerico ? (
          <div
            style={{
              font: `800 ${tagliaNumero(headline)}px/0.86 ${FONT}`,
              letterSpacing: '-0.055em',
              fontVariantNumeric: 'tabular-nums',
              color: pal.accent,
              marginLeft: -8,
            }}
          >
            {headline}
          </div>
        ) : (
          <div
            style={{
              font: `800 ${tagliaTitolo(headline)}px/1 ${FONT}`,
              letterSpacing: '-0.03em',
              color: pal.fg,
              overflowWrap: 'anywhere',
              textWrap: 'balance',
            } as CSSProperties}
          >
            {headline}
          </div>
        )}

        {(slide.title || slide.caption) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {slide.title && (
              <div style={{ font: `700 52px/60px ${FONT}`, letterSpacing: '-0.02em', color: pal.fg, overflowWrap: 'anywhere' }}>{slide.title}</div>
            )}
            {slide.caption && (
              <div style={{ font: `600 36px/46px ${FONT}`, color: pal.muted, overflowWrap: 'anywhere' }}>{slide.caption}</div>
            )}
          </div>
        )}

        {photoSrc && <Foto src={photoSrc} pal={pal} />}

        {slide.stats.length > 0 && (
          <div style={{ marginTop: 'auto' }}>
            <Celle stats={slide.stats} pal={pal} compatte={recap || slide.stats.length > 4} />
          </div>
        )}
      </div>

      {/* Il piè: il marchio, ancorato a 88 dal fondo. */}
      <div
        style={{
          position: 'absolute',
          left: MARGINE,
          right: MARGINE,
          bottom: MARGINE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Sui fondi scuri il marchio è senza il quadrato navy (§10.2). */}
          <BrandMark size={72} bare={pal.key === 'navy'} />
          <span style={{ font: `700 34px/40px ${FONT}`, letterSpacing: '-0.02em', color: pal.fg }}>Beach Diary</span>
        </div>
        <span style={{ font: `700 28px/36px ${FONT}`, letterSpacing: '0.06em', fontVariantNumeric: 'tabular-nums', color: pal.muted }}>
          {due(index + 1)} / {due(total)}
        </span>
      </div>
    </div>
  )
}
