// ============================================================================
// Ciò che la slide di Beach Wrapped decide del suo contenuto, uguale per la
// slide a schermo (WrappedModal, CSS coi token) e per la tela del PNG
// (WrappedSlideCard, 1080×1920 coi letterali): così le due non divergono.
// ============================================================================
import type { WrappedSlideKind } from '../../lib/derive'
import type { PalloUmore } from '../Pallo'

/**
 * Quanto può essere grande il titolo: i numeri e le parole corte alla taglia
 * piena del design (96 su 390), poi a scalare con la lunghezza, perché un nome
 * lungo non si spezzi a metà parola. `l` va a capo.
 */
export type TagliaTitolo = 'xl' | 's' | 'm' | 'l'

export function tagliaTitolo(headline: string): TagliaTitolo {
  const n = headline.trim().length
  // «35», «66%», «Luca»: alla taglia piena.
  if (n <= 4) return 'xl'
  if (n <= 7) return 's'
  if (n <= 11) return 'm'
  return 'l'
}

/** «Stagione 2026» → «2026», per l'intestazione «Beach Wrapped · 2026». */
export function annoDi(label: string): string {
  return label.replace(/^stagione\s+/i, '').trim()
}

/**
 * Una foto verticale (più stretta di 4:5) lascia posto accanto a sé: lì ci sta
 * Pallo che esulta, a schermo come sulla tela. Le altre prendono la riga.
 */
export function fotoStretta(f: { w: number; h: number }): boolean {
  return f.w / f.h <= 0.8
}

/**
 * L'espressione di Pallo per ogni slide: festeggia le vittorie e i podi, fa
 * il figo sulla serie record, ha gli occhi a cuore per il compagno, resta a
 * bocca aperta davanti ai numeri curiosi. Uguale a schermo e nel PNG (ogni
 * umore si legge anche da fermo).
 */
export function umoreSlide(kind: WrappedSlideKind): PalloUmore {
  switch (kind) {
    case 'wins':
    case 'podium':
      return 'festa'
    case 'streak':
      return 'cool'
    case 'partner':
      return 'cuori'
    case 'funfacts':
    case 'volume':
      return 'sorpreso'
    case 'rival':
      return 'pensa'
    case 'outro':
      return 'occhiolino'
    default:
      return 'esulta'
  }
}
