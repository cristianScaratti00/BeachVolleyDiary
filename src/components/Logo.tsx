import { useId } from 'react'
import type { CSSProperties } from 'react'
import { LIT } from '../lib/theme'
import './Logo.css'

// ============================================================================
// Il marchio "Beach Diary" del redesign: il pallone di Pallo senza la faccia —
// bianco, con la fascia arancio in alto e il filo bianco intorno. È lo stesso
// disegno del Benvenuto (viewBox -32 -32 64 64) e della favicon.
//
// Il vecchio pin arancio con le cuciture cambiava dettaglio con la misura
// perché i tratti da 2px a 16px diventavano una macchia. Il pallone non ne ha
// bisogno: la fascia è un decimo del disegno e a 16px resta una lunetta
// arancio leggibile, quindi il disegno è uno solo a ogni taglia.
//
// Due modi di posarlo:
//   - nella TESSERA d'inchiostro (default): Sidebar, splash, la favicon, le
//     slide esportate su fondo chiaro. Il pallone bianco ha bisogno di un fondo
//     scuro per esistere, e la tessera glielo porta ovunque;
//   - NUDO (`bare`): sui fondi scuri che ce l'hanno già (Benvenuto, la slide
//     navy della Storia). Il filo bianco è quello che lo stacca dal buio.
// ============================================================================
// È un disegno, uguale nell'app, nella favicon e nei PNG esportati: i colori
// sono i letterali dei token (`LIT`), perché qui una custom property non arriva.
const INK = LIT.ink
const ARANCIO = LIT.accent
const BIANCO = LIT.surface

// La fascia: lo stesso arco della palla in volo della scena, più spesso.
const FASCIA = 'M-34 -14 C-12 -30 16 -30 34 -12'

interface BrandMarkProps {
  size?: number
  /** Senza la tessera d'inchiostro, per posarlo su fondi scuri (Benvenuto). */
  bare?: boolean
  style?: CSSProperties
}

export function BrandMark({ size = 40, bare = false, style }: BrandMarkProps) {
  // `useId` e non un id fisso: due marchi nella stessa pagina (sidebar + splash)
  // con lo stesso id di clipPath si contenderebbero la definizione, e il primo
  // montato vincerebbe per entrambi.
  const clip = 'bvd-palla-' + useId().replace(/:/g, '')

  // Dentro la tessera il pallone respira: 72% del lato, come prima il pin.
  const px = bare ? size : Math.round(size * 0.72)
  const radius = Math.max(6, Math.round(size * 0.26))

  const svg = (
    <svg width={px} height={px} viewBox="-32 -32 64 64" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={clip}>
          <circle r="30" />
        </clipPath>
      </defs>
      <circle r="30" fill={BIANCO} />
      {/* Il ritaglio tiene la fascia DENTRO il pallone. */}
      <path d={FASCIA} clipPath={`url(#${clip})`} stroke={ARANCIO} strokeWidth="10" />
      <circle r="30" stroke={BIANCO} strokeWidth="3" />
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

// Marchio + wordmark "Beach Diary" (Sidebar, Benvenuto). Il redesign scrive
// le due parole allo stesso peso, 700, nello stesso inchiostro. `light` = su
// fondo scuro; `bare` = marchio senza tessera. La taglia del testo segue
// quella del marchio.
export function BrandLockup({ size = 40, light = false, bare = false }: {
  size?: number
  light?: boolean
  bare?: boolean
  /** @deprecated la taglia del testo segue `size`. */
  textSize?: number
  /** @deprecated lo spazio viene dai token. */
  gap?: number
}) {
  return (
    <span className="ui-brand" data-size={size >= 72 ? 'l' : size >= 40 ? 'm' : 's'} data-light={light ? '' : undefined}>
      <BrandMark size={size} bare={bare} />
      <span className="ui-brand-word">Beach Diary</span>
    </span>
  )
}
