// ============================================================================
// I numeri chiave (Home e Statistiche): win rate, differenziale, tornei vinti,
// serie record. Numeri da tabellone (ART_DIRECTION §2.4.3) che salgono da zero
// una volta per sessione e per schermata (`rise`, MOTION.md M1), poi scattano
// solo se cambiano. Si colora solo il win rate: è una vittoria (§3.3.8).
// ============================================================================
import type { DashboardStats } from '../../lib/derive'
import { StatGrid, StatTile } from '../ui/Stat'

export function KeyNumbers({ s, rise, size = 'xl' }: {
  s: DashboardStats
  /** La chiave della schermata per la salita da zero: 'home', 'statistiche'. */
  rise?: string
  size?: 'xl' | 'l'
}) {
  return (
    <StatGrid cols={4} label="Numeri chiave">
      <StatTile value={`${s.winPct}%`} label={`Vittorie · ${s.won}/${s.played}`} tone="win" size={size} rise={rise} />
      <StatTile value={s.diffStr} label="Differenziale punti" size={size} rise={rise} />
      <StatTile value={s.tWon} label={`Tornei vinti su ${s.tPlayed}`} size={size} rise={rise} />
      <StatTile value={s.streak} label="Serie record" size={size} rise={rise} />
    </StatGrid>
  )
}
