// Win rate per fase del torneo (Girone → Finale): una riga con barra per fase.
import type { DashboardStats } from '../../lib/derive'
import { MeterRow } from '../ui/Stat'
import { ChartCard, EmptyNote } from './Chart'

const partite = (n: number) => (n === 1 ? '1 partita' : `${n} partite`)

export function PhaseCard({ s }: { s: DashboardStats }) {
  return (
    <ChartCard title="Per fase">
      {s.phaseRows.length ? (
        <div className="dash-rows">
          {s.phaseRows.map((p) => (
            <MeterRow key={p.phase} label={p.phase} pct={p.winPct} sub={`${partite(p.played)} · ${p.won} vinte`} />
          ))}
        </div>
      ) : (
        <EmptyNote>Nessuna partita in questo periodo.</EmptyNote>
      )}
    </ChartCard>
  )
}
