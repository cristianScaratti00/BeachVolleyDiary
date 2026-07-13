import type { DashboardStats } from '../../lib/derive'
import { MeterRow, EmptyNote } from '../ui'

// Win rate per fase del torneo (barre).
export function PhaseCard({ s }: { s: DashboardStats }) {
  return (
    <div className="card" style={{ padding: 22 }}>
      <div className="lbl" style={{ marginBottom: 16 }}>Win rate per fase</div>
      {s.phaseRows.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          {s.phaseRows.map((p) => (
            <MeterRow key={p.phase} label={p.phase} pct={p.winPct} barW={p.barW} sub={`${p.played} partite · ${p.won} vinte`} />
          ))}
        </div>
      ) : (
        <EmptyNote>Ancora nessuna partita nel periodo.</EmptyNote>
      )}
    </div>
  )
}
