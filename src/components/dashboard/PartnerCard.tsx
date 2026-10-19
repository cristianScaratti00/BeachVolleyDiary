// ============================================================================
// Win rate per compagno: i primi 6 (UX §6.2), poi «Vedi tutti» porta alla tab
// Compagni. Una riga con barra per compagno, ordinata dal win rate più alto.
// ============================================================================
import type { DashboardStats } from '../../lib/derive'
import { Link } from '../../app/router'
import { MeterRow } from '../ui/Stat'
import { ChartCard, EmptyNote } from './Chart'

const PRIMI = 6
const partite = (n: number) => (n === 1 ? '1 partita' : `${n} partite`)

export function PartnerCard({ s }: { s: DashboardStats }) {
  const righe = s.partnerRows.slice(0, PRIMI)
  return (
    <ChartCard
      title="Per compagno"
      wide
      extra={
        s.partnerRows.length > 0 ? (
          <Link to={{ name: 'compagni' }} className="dash-link">
            Vedi tutti
          </Link>
        ) : undefined
      }
    >
      {righe.length ? (
        <div className="dash-partners">
          {righe.map((p) => (
            <MeterRow key={p.id} label={p.name} pct={p.winPct} sub={`${partite(p.played)} · ${p.won} vinte`} />
          ))}
        </div>
      ) : (
        <EmptyNote>Aggiungi partite con i tuoi compagni per vedere il win rate.</EmptyNote>
      )}
    </ChartCard>
  )
}
