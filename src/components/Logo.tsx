import type { CSSProperties } from 'react'

// ============================================================================
// Logo dell'app "Beach Diary" (concept 4A da Claude Design): quadrato navy
// arrotondato con una rete da beach volley (banda + maglia) e la palla arancione
// in alto a destra. Palette dell'app: navy #1B2A4A · arancio #FF6B35 · sabbia.
// L'SVG è in viewBox 0..100 quindi scala a qualsiasi dimensione.
// ============================================================================
const INK = '#1B2A4A'

// Marchio (solo icona). `detail` aggiunge maglia fitta, cavi laterali e cuciture
// della palla — pensato per le dimensioni grandi (es. splash).
export function BrandMark({ size = 40, detail = false, bare = false, style }: { size?: number; detail?: boolean; bare?: boolean; style?: CSSProperties }) {
  // `bare` = solo rete+palla senza il quadrato navy, per posarlo su fondi scuri
  // (es. pannello login) dove il quadrato navy sarebbe invisibile.
  const radius = Math.max(6, Math.round(size * 0.26))
  const svgSize = bare ? size : Math.round(size * 0.72)
  const svg = detail ? (
    <svg width={svgSize} height={svgSize} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <g stroke="#FAF8F5" strokeWidth="1.6" strokeLinecap="round">
        <line x1="16" y1="46" x2="84" y2="46" />
        <line x1="16" y1="58" x2="84" y2="58" />
        <line x1="16" y1="70" x2="84" y2="70" />
        <line x1="30" y1="40" x2="30" y2="72" />
        <line x1="44" y1="40" x2="44" y2="72" />
        <line x1="58" y1="40" x2="58" y2="72" />
        <line x1="72" y1="40" x2="72" y2="72" />
      </g>
      <line x1="16" y1="40" x2="84" y2="40" stroke="#FAF8F5" strokeWidth="5" strokeLinecap="round" />
      <line x1="17" y1="37" x2="17" y2="73" stroke="#FAF8F5" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="83" y1="37" x2="83" y2="73" stroke="#FAF8F5" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="70" cy="26" r="13" fill="#FF6B35" />
      <path d="M60 23 Q70 17 80 23 M65 15 Q72 26 66 37 M77 16 Q70 26 76 37" stroke="#1B2A4A" strokeWidth="1.7" fill="none" strokeLinecap="round" />
    </svg>
  ) : (
    <svg width={svgSize} height={svgSize} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <g stroke="#FAF8F5" strokeWidth="2.2" strokeLinecap="round">
        <line x1="18" y1="48" x2="82" y2="48" />
        <line x1="18" y1="64" x2="82" y2="64" />
        <line x1="38" y1="40" x2="38" y2="72" />
        <line x1="62" y1="40" x2="62" y2="72" />
      </g>
      <line x1="18" y1="40" x2="82" y2="40" stroke="#FAF8F5" strokeWidth="5" strokeLinecap="round" />
      <circle cx="66" cy="28" r="11" fill="#FF6B35" />
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
