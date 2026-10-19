// ============================================================================
// La TELA di una slide del Beach Wrapped: un nodo fisso 1080×1920 catturato
// da html-to-image. È la slide a schermo del redesign (schermata 18) portata a
// 1080 (× 2.77): fondo pieno, Pallo che esulta, occhiello, numero enorme a
// 900, titolo, didascalia; in più le celle delle statistiche e il marchio.
//
// Regole della tela (diverse da quelle dell'interfaccia, di proposito):
// - colori LETTERALI e OPACHI dalla palette (`palette.ts`), niente custom
//   property: html-to-image non le porta nel PNG;
// - niente `backdrop-filter`, niente ombre, niente gradienti;
// - Geist, scritto come famiglia letterale (`EXPORT_FONT`): si incorpora e il
//   recap esce uguale su iPhone e su Android (il visore lo carica prima);
// - misure in px "veri" a 1080: l'anteprima non scala questo nodo, lo copia;
// - le foto non si ritagliano mai: intere, con la loro proporzione (le misure
//   naturali arrivano con il data URL, `foto.ts`);
// - zone sicure di Instagram: niente testo essenziale nei primi 250px e negli
//   ultimi 250px (avatar, risposta, sticker). L'intestazione e il marchio ci
//   stanno: non sono informazioni.
// ============================================================================
import type { CSSProperties } from 'react'
import type { WrappedSlide } from '../../lib/derive'
import { BrandMark } from '../Logo'
import { Pallo } from '../Pallo'
import { EXPORT_FONT } from './palette'
import type { WrappedPalette } from './palette'
import { adatta } from './foto'
import type { FotoTela } from './foto'
import { annoDi, fotoStretta, tagliaTitolo, umoreSlide } from './slide'
import type { TagliaTitolo } from './slide'

const W = 1080
const H = 1920
const MARGINE = 88
const ZONA_SICURA = 250
/** Il filetto attorno alla foto: sta FUORI dalla misura della foto. */
const FILO = 2
/** L'altezza massima della foto: con il titolo più lungo il resto ci sta ancora. */
const FOTO_MAX_H = 640

/** Le taglie del titolo a 1080: quelle dello schermo (96 · 64 · 48 · 38) × 2.77. */
const TITOLO: Record<TagliaTitolo, number> = { xl: 266, s: 178, m: 132, l: 104 }

/** Sull'inchiostro le braccia d'inchiostro di Pallo sparirebbero: un filo di luce le ridisegna. */
function luce(pal: WrappedPalette): CSSProperties | undefined {
  return pal.key === 'ink' ? { filter: `drop-shadow(0 0 3px ${pal.fg}) drop-shadow(0 0 1px ${pal.fg})` } : undefined
}

// Foto di copertina (intro, podio): INTERA, con la sua proporzione, grande
// quanto entra in 904 × 640 (raggio 40, filetto della palette). Prende il
// posto di Pallo; se è verticale Pallo le sta accanto.
function Foto({ foto, pal, kind }: { foto: FotoTela; pal: WrappedPalette; kind: WrappedSlide['kind'] }) {
  const { w, h } = adatta(foto, W - MARGINE * 2 - FILO * 2, FOTO_MAX_H - FILO * 2)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 32, flex: 'none', marginBottom: 24 }}>
      <img
        src={foto.src}
        alt=""
        width={foto.w}
        height={foto.h}
        style={{
          width: w,
          height: h,
          flex: 'none',
          display: 'block',
          borderRadius: 40,
          border: `${FILO}px solid ${pal.line}`,
          boxSizing: 'content-box',
        }}
      />
      {fotoStretta(foto) && <Pallo umore={umoreSlide(kind)} size={240} mani={pal.mani} ombra={false} style={luce(pal)} />}
    </div>
  )
}

// Le statistiche: celle separate da filetti di 2px, non da riquadri.
function Celle({ stats, pal }: { stats: WrappedSlide['stats']; pal: WrappedPalette }) {
  const cols = stats.length === 1 ? 1 : stats.length >= 5 ? 3 : 2
  const compatte = cols === 3
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, width: '100%', flex: 'none', marginTop: 24, borderTop: `2px solid ${pal.line}` }}>
      {stats.map((st, i) => {
        const col = i % cols
        return (
          <div
            key={i}
            style={{
              borderBottom: `2px solid ${pal.line}`,
              borderLeft: col > 0 ? `2px solid ${pal.line}` : undefined,
              padding: compatte ? '28px 0 28px 28px' : '36px 0 36px 36px',
              paddingLeft: col > 0 ? (compatte ? 28 : 36) : 0,
              minWidth: 0,
            }}
          >
            <div
              style={{
                font: `800 ${compatte ? 84 : 104}px/1 ${EXPORT_FONT}`,
                letterSpacing: '-0.04em',
                fontVariantNumeric: 'tabular-nums',
                color: pal.fg,
                whiteSpace: 'nowrap',
              }}
            >
              {st.value}
            </div>
            <div style={{ font: `600 ${compatte ? 30 : 34}px/1.2 ${EXPORT_FONT}`, color: pal.muted, marginTop: 12 }}>{st.label}</div>
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
  /** L'intervallo del recap («Stagione 2026»): l'intestazione in alto. */
  label: string
  /** La foto già inlinata come data-URL, con le misure naturali (assente → Pallo). */
  foto?: FotoTela | null
}

export default function WrappedSlideCard({ slide, pal, index, total, label, foto }: WrappedSlideCardProps) {
  const headline = slide.headline.trim()
  const taglia = tagliaTitolo(headline)
  const due = (n: number) => String(n).padStart(2, '0')
  const testo: CSSProperties = { overflowWrap: 'anywhere' }

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
        fontFamily: EXPORT_FONT,
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {/* L'intestazione, nella zona alta che Instagram copre: è un marchio. */}
      <div style={{ position: 'absolute', left: MARGINE, right: MARGINE, top: 132, font: `700 36px/1.2 ${EXPORT_FONT}`, color: pal.fg }}>
        Beach Wrapped · {annoDi(label)}
      </div>

      {/* Il contenuto, centrato fra le due zone sicure. */}
      <div
        style={{
          position: 'absolute',
          left: MARGINE,
          right: MARGINE,
          top: ZONA_SICURA,
          bottom: ZONA_SICURA,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 32,
        }}
      >
        {foto ? (
          <Foto foto={foto} pal={pal} kind={slide.kind} />
        ) : (
          <Pallo
            umore={umoreSlide(slide.kind)}
            size={slide.stats.length > 4 ? 220 : 288}
            mani={pal.mani}
            ombra={false}
            style={{ marginBottom: 20, marginLeft: -12, ...luce(pal) }}
          />
        )}
        <div style={{ font: `700 42px/1.2 ${EXPORT_FONT}`, color: pal.muted, ...testo }}>{slide.eyebrow}</div>
        <div
          style={{
            font: `900 ${TITOLO[taglia]}px/0.9 ${EXPORT_FONT}`,
            letterSpacing: '-0.052em',
            fontVariantNumeric: 'tabular-nums',
            color: pal.fg,
            marginLeft: -6,
            textWrap: 'balance',
            ...testo,
          } as CSSProperties}
        >
          {headline}
        </div>
        {slide.title && <div style={{ font: `700 72px/1.1 ${EXPORT_FONT}`, letterSpacing: '-0.023em', maxWidth: 860, ...testo }}>{slide.title}</div>}
        {slide.caption && <div style={{ font: `500 42px/1.3 ${EXPORT_FONT}`, color: pal.muted, ...testo }}>{slide.caption}</div>}
        {slide.stats.length > 0 && <Celle stats={slide.stats} pal={pal} />}
      </div>

      {/* Il piè: il marchio e il numero della slide, ancorati a 88 dal fondo. */}
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
          {/* Sull'inchiostro il marchio è senza il suo quadrato d'inchiostro. */}
          <BrandMark size={72} bare={pal.key === 'ink'} />
          <span style={{ font: `700 34px/40px ${EXPORT_FONT}`, letterSpacing: '-0.02em', color: pal.fg }}>Beach Diary</span>
        </div>
        <span style={{ font: `700 30px/36px ${EXPORT_FONT}`, fontVariantNumeric: 'tabular-nums', color: pal.muted }}>
          {due(index + 1)} / {due(total)}
        </span>
      </div>
    </div>
  )
}
