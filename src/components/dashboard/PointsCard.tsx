import type { DashboardStats } from '../../lib/derive'

// Barre punti fatti vs subiti + medie.
export function PointsCard({ s }: { s: DashboardStats }) {
  return (
    <div className="card" style={{ padding: 22 }}>
      <div className="lbl" style={{ marginBottom: 16 }}>Punti fatti vs subiti</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', font: "700 12px 'Nunito Sans'", marginBottom: 6 }}>
            <span style={{ color: 'rgba(27,42,74,.55)' }}>Fatti</span>
            <span className="num">{s.pf}</span>
          </div>
          <div className="barwrap" style={{ height: 14, background: '#F2F0EC', borderRadius: 4, overflow: 'hidden' }}>
            <div className="bar" style={{ height: '100%', width: s.barForW, background: '#FF6B35', borderRadius: 4, opacity: 0.92, transition: 'width .7s ease' }} />
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', font: "700 12px 'Nunito Sans'", marginBottom: 6 }}>
            <span style={{ color: 'rgba(27,42,74,.55)' }}>Subiti</span>
            <span className="num">{s.pa}</span>
          </div>
          <div className="barwrap" style={{ height: 14, background: '#F2F0EC', borderRadius: 4, overflow: 'hidden' }}>
            <div className="bar" style={{ height: '100%', width: s.barAgW, background: '#1B2A4A', borderRadius: 4, opacity: 0.85, transition: 'width .7s ease' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 26, paddingTop: 14, borderTop: '1px solid rgba(27,42,74,.08)' }}>
          <div><div className="num" style={{ fontSize: 20 }}>{s.avgFor}</div><div className="lbl">media fatti</div></div>
          <div><div className="num" style={{ fontSize: 20 }}>{s.avgAg}</div><div className="lbl">media subiti</div></div>
        </div>
      </div>
    </div>
  )
}
