// ============================================================================
// Piazzamenti: quante volte ogni risultato. Ogni riga comincia con la medaglia
// del redesign (la stessa delle righe dei tornei: 1° arancio, podio col filo
// d'inchiostro, il resto grigia), poi la barra nel colore del suo gradino —
// 1° --data-win, podio --data-ink, il resto --data-rest — e il conteggio.
// La medaglia dice il piazzamento a parole agli screen reader («Primo
// posto»): «1° 🏆» è un valore del DB e il trofeo non si legge (C15).
// ============================================================================
import type { DashboardStats } from '../../lib/derive'
import { Bar } from '../ui/Stat'
import { Medal, medalTier } from '../ui/Medal'
import { ChartCard, EmptyNote } from './Chart'

const TONO = { win: 'win', podium: 'ink', rest: 'rest', open: 'rest' } as const

export function PlacementCard({ s, rise }: { s: DashboardStats; rise?: number }) {
  return (
    <ChartCard title="Piazzamenti" rise={rise}>
      {s.placementDist.length ? (
        <ul className="dash-placements">
          {s.placementDist.map((pl) => (
            <li key={pl.label} className="dash-placement">
              <Medal placement={pl.label} size="md" />
              <Bar pct={Number.parseInt(pl.barW, 10) || 0} tone={TONO[medalTier(pl.label)]} />
              <span className="dash-row-n">
                {pl.count}
                <span className="sr-only">{pl.count === 1 ? ' torneo' : ' tornei'}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyNote>Nessun torneo in questo periodo.</EmptyNote>
      )}
    </ChartCard>
  )
}
