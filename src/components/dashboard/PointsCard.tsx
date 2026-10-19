// ============================================================================
// Punti fatti e subiti: due barre nello stesso binario (i fatti d'inchiostro,
// --data-ink, come le vinte della Home; i subiti --data-rest) e le medie
// sotto. Le barre traslano dentro il binario (MOTION.md §4.4): `width` faceva
// layout a ogni fotogramma.
// ============================================================================
import type { DashboardStats } from '../../lib/derive'
import { Bar, StatFooter } from '../ui/Stat'
import { ChartCard, EmptyNote } from './Chart'

const pct = (w: string) => Number.parseInt(w, 10) || 0

export function PointsCard({ s, rise }: { s: DashboardStats; rise?: number }) {
  if (s.played === 0) {
    return (
      <ChartCard title="Punti" rise={rise}>
        <EmptyNote>Nessuna partita in questo periodo.</EmptyNote>
      </ChartCard>
    )
  }
  return (
    <ChartCard title="Punti" rise={rise}>
      <div className="dash-rows">
        <div className="dash-points-row">
          <div className="dash-row-head">
            <span className="dash-row-label">Fatti</span>
            <span className="dash-row-n">{s.pf}</span>
          </div>
          <Bar pct={pct(s.barForW)} tone="ink" size="lg" />
        </div>
        <div className="dash-points-row">
          <div className="dash-row-head">
            <span className="dash-row-label">Subiti</span>
            <span className="dash-row-n">{s.pa}</span>
          </div>
          <Bar pct={pct(s.barAgW)} tone="rest" size="lg" />
        </div>
      </div>
      <StatFooter
        items={[
          { value: s.avgFor, label: 'Media fatti' },
          { value: s.avgAg, label: 'Media subiti' },
        ]}
      />
    </ChartCard>
  )
}
