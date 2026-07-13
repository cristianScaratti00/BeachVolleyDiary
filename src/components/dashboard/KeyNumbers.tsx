import type { DashboardStats } from '../../lib/derive'
import { StatGrid, StatTile } from '../ui'

// Riga dei numeri chiave della dashboard (vittorie, differenziale, tornei, serie).
export function KeyNumbers({ s }: { s: DashboardStats }) {
  return (
    <StatGrid min={150} radius={14} mt={22}>
      <StatTile value={`${s.winPct}%`} label={`Vittorie · ${s.won}/${s.played}`} color="#FF6B35" valueSize={40} pad={20} />
      <StatTile value={s.diffStr} label="Differenziale punti" valueSize={40} pad={20} />
      <StatTile
        value={<>{s.tWon}<span style={{ fontSize: 20, color: 'rgba(27,42,74,.3)' }}> / {s.tPlayed}</span></>}
        label={`Tornei vinti · ${s.podi} podi`}
        valueSize={40}
        pad={20}
      />
      <StatTile value={s.streak} label="Serie vittorie record" valueSize={40} pad={20} />
    </StatGrid>
  )
}
