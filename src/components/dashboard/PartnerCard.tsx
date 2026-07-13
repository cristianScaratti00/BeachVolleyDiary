import type { DashboardStats } from '../../lib/derive'
import { MeterRow, EmptyNote } from '../ui'

// Win rate per compagno (card a larghezza piena) + link "Vedi tutti".
export function PartnerCard({ s, goCompagni }: { s: DashboardStats; goCompagni: () => void }) {
  return (
    <div className="card" style={{ padding: 22, marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="lbl">Win rate per compagno</div>
        <div className="chip" style={{ font: "700 12px 'Nunito Sans'", color: '#FF6B35', cursor: 'pointer' }} onClick={goCompagni}>Vedi tutti</div>
      </div>
      {s.partnerRows.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))', gap: 18 }}>
          {s.partnerRows.map((p) => (
            <MeterRow key={p.id} label={p.name} pct={p.winPct} barW={p.barW} sub={`${p.played} partite · ${p.won} vinte`} />
          ))}
        </div>
      ) : (
        <EmptyNote>Aggiungi partite con i tuoi compagni per vedere il win rate.</EmptyNote>
      )}
    </div>
  )
}
