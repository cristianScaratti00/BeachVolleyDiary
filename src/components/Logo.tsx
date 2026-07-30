import { useId } from 'react'
import type { CSSProperties } from 'react'

// ============================================================================
// Logo "Beach Diary" — pin arancione con palla sabbia (Claude Design, opzione
// 3a "definitivo"). Sostituisce il vecchio marchio a rete da beach volley: la
// rete a dimensioni piccole diventava un reticolo illeggibile, il pin resta
// riconoscibile anche a 16px.
// Palette: navy #1B2A4A · arancio #FF6B35 · sabbia #FAF8F5.
//
// ── Il dettaglio dipende dalla MISURA, non da una scelta ────────────────────
// Il design declina lo stesso marchio in tre livelli, ed è una regola tipografica
// più che una preferenza: le cuciture sono tratti da 2px su una palla di 38px,
// quindi sotto una certa dimensione diventano una macchia grigia. Il componente
// sceglie da sé in base ai px effettivi:
//
//   ≥ 40px  sei cuciture (tre dal centro + tre archi esterni)
//   ≥ 28px  tre cuciture, tratto più spesso
//   < 28px  solo pin e palla, palla leggermente più grande (r 20 invece di 19)
//
// Le soglie vengono dai campioni del design, che mette sei cuciture a 44px, tre
// a 42px e nessuna a 26px: il confine del "niente cuciture" sta fra 26 e 42.
//
// L'SVG è in viewBox 0..100, quindi scala a qualsiasi dimensione.
// ============================================================================
const INK = '#1B2A4A'
const ORANGE = '#FF6B35'
const SAND = '#FAF8F5'

// Il pin: goccia che parte dalla punta in basso (50,90) e chiude sul cerchio.
const PIN = 'M50 90 L34 58 A26 26 0 1 1 66 58 Z'

// Le tre cuciture che partono dal centro della palla: sono quelle che da sole
// bastano a far leggere "pallavolo", ed è perché a misura media restano solo loro.
const CUCITURE_CENTRO = [
  'M50 40 C57 35 59 27 51 19.5',
  'M50 40 C52 48.5 61 53 68 48',
  'M50 40 C41.5 38 35 43 33 51',
]
// Gli archi esterni: completano il disegno, ma servono spazio per non impastarsi.
const CUCITURE_ESTERNE = [
  'M56 18.5 C62 23.5 66 31 67.5 38',
  'M63 55 C54.5 59.5 45.5 59.5 37 55',
  'M32.5 38 C34 31 38 23.5 44 18.5',
]

interface BrandMarkProps {
  size?: number
  /** Senza il quadrato navy, per posarlo su fondi scuri (es. pannello login). */
  bare?: boolean
  style?: CSSProperties
}

export function BrandMark({ size = 40, bare = false, style }: BrandMarkProps) {
  // `useId` e non un id fisso: due marchi nella stessa pagina (sidebar + splash)
  // con lo stesso id di clipPath si contenderebbero la definizione, e il primo
  // montato vincerebbe per entrambi.
  const clip = 'bvd-ball-' + useId().replace(/:/g, '')

  const radius = Math.max(6, Math.round(size * 0.26))
  // Dentro il quadrato il marchio respira: 72% del contenitore, come nel design.
  const px = bare ? size : Math.round(size * 0.72)

  const cuciture = px >= 40 ? [...CUCITURE_CENTRO, ...CUCITURE_ESTERNE] : px >= 28 ? CUCITURE_CENTRO : []
  const tratto = px >= 40 ? 2.2 : 2.8
  // Palla più grande quando non ci sono cuciture: senza il disegno interno una
  // palla piccola sembra un buco, non un oggetto.
  const raggioPalla = cuciture.length ? 19 : 20
  // Riga d'ombra sotto la punta: sabbia trasparente, quindi si vede solo sul
  // navy. Sul marchio nudo (fondi chiari o scuri qualsiasi) sparirebbe o
  // sporcherebbe, e infatti nel design c'è solo nella versione grande su navy.
  const terreno = !bare && px >= 40

  const svg = (
    <svg width={px} height={px} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      {cuciture.length > 0 && (
        <defs>
          <clipPath id={clip}>
            <circle cx="50" cy="40" r={raggioPalla} />
          </clipPath>
        </defs>
      )}
      <path d={PIN} fill={ORANGE} />
      <circle cx="50" cy="40" r={raggioPalla} fill={SAND} />
      {cuciture.length > 0 && (
        // Il ritaglio è ciò che tiene le cuciture DENTRO la palla: senza, gli
        // archi esterni uscirebbero sul corpo arancione del pin.
        <g clipPath={`url(#${clip})`} stroke={INK} strokeWidth={tratto} fill="none" strokeLinecap="round">
          {cuciture.map((d) => <path key={d} d={d} />)}
        </g>
      )}
      {terreno && (
        <line x1="30" y1="90" x2="70" y2="90" stroke="rgba(250,248,245,.45)" strokeWidth="4" strokeLinecap="round" />
      )}
    </svg>
  )

  if (bare) {
    return <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none', ...style }}>{svg}</span>
  }
  return (
    <div style={{ width: size, height: size, borderRadius: radius, background: INK, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', ...style }}>
      {svg}
    </div>
  )
}

// Marchio + wordmark "Beach Diary" (per header, sidebar, splash, login).
// `light` = testo bianco su fondo scuro; `bare` = marchio senza quadrato navy.
export function BrandLockup({ size = 38, textSize = 18, gap = 12, light = false, bare = false }: { size?: number; textSize?: number; gap?: number; light?: boolean; bare?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap }}>
      <BrandMark size={size} bare={bare} />
      <span style={{ font: `700 ${textSize}px 'Space Grotesk'`, letterSpacing: '-.4px', color: light ? '#fff' : INK, whiteSpace: 'nowrap' }}>
        Beach<span style={{ fontWeight: 400, color: light ? 'rgba(255,255,255,.6)' : 'rgba(27,42,74,.55)' }}> Diary</span>
      </span>
    </div>
  )
}
