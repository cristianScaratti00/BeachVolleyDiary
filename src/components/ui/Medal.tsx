// ============================================================================
// La medaglia del piazzamento (il redesign): un cerchio che dice com'è finita,
// a sinistra delle righe dei tornei, nel titolo del dettaglio, nel Diario.
//
//   1°          arancio pieno col filo arancio scuro      («Vinto»)
//   2° · 3°     carta bianca col filo d'inchiostro         («Podio»)
//   il resto    carta calda col filo chiaro, testo corto   («Semi», «Gir.»)
//   In corso    carta calda col filo tratteggiato e «…»
//
// Il testo è la forma breve; il nome intero va agli screen reader («Primo
// posto», «Semifinale»). Il colore non è mai l'unico segnale: c'è il testo, e
// il riempimento cambia (pieno / filo scuro / filo chiaro).
// ============================================================================
import { placementText } from './Badge'
import './Medal.css'

export type MedalSize = 'sm' | 'md' | 'lg'
export type MedalTier = 'win' | 'podium' | 'rest' | 'open'

const CORTO: Record<string, string> = {
  Semifinale: 'Semi',
  // «Quarti» per intero tocca il bordo anche a 42px: si accorcia come gli altri.
  Quarti: 'Qrt.',
  Ottavi: 'Ott.',
  Gironi: 'Gir.',
  'In corso': '…',
}

const LUNGO: Record<string, string> = {
  '1°': 'Primo posto',
  '2°': 'Secondo posto',
  '3°': 'Terzo posto',
  'In corso': 'In corso',
}

/** Il gradino del piazzamento: decide il riempimento. */
export function medalTier(placement: string): MedalTier {
  const p = placementText(placement).split(' · ')[0]
  if (p === '1°') return 'win'
  if (p === '2°' || p === '3°') return 'podium'
  if (p === 'In corso' || p === '') return 'open'
  return 'rest'
}

export function Medal({ placement, size = 'md', className }: {
  /** Il valore del DB («1° 🏆», «Semifinale», «2° · Silver» va bene lo stesso). */
  placement: string
  size?: MedalSize
  className?: string
}) {
  const p = placementText(placement).split(' · ')[0]
  const tier = medalTier(placement)
  const corto = CORTO[p] ?? p
  const lungo = LUNGO[p] ?? p
  return (
    <span className={className ? `ui-medal ${className}` : 'ui-medal'} data-tier={tier} data-size={size} data-long={corto.length > 3 ? '' : undefined}>
      <span aria-hidden="true">{corto}</span>
      <span className="sr-only">{lungo}</span>
    </span>
  )
}
