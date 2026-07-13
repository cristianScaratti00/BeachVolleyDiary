import type { DashboardStats } from '../../lib/derive'
import { EmptyNote } from '../ui'

// Distribuzione dei piazzamenti nei tornei (barre orizzontali colorate).
export function PlacementCard({ s }: { s: DashboardStats }) {
  return (
    <div className="card" style={{ padding: 22 }}>
      <div className="lbl" style={{ marginBottom: 16 }}>Piazzamenti nei tornei</div>
      {s.placementDist.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          {s.placementDist.map((pl) => (
            <div key={pl.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ font: "700 13px 'Nunito Sans'", width: 92, flex: 'none' }}>{pl.label}</span>
              <div style={{ flex: 1, height: 10, background: '#F2F0EC', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: pl.barW, background: pl.color, borderRadius: 6, transition: 'width .6s ease' }} />
              </div>
              <span className="num" style={{ fontSize: 13, width: 16, textAlign: 'right', flex: 'none' }}>{pl.count}</span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyNote>Ancora nessun torneo nel periodo.</EmptyNote>
      )}
    </div>
  )
}
