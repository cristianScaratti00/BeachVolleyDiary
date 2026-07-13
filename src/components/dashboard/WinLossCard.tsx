import type { DashboardStats } from '../../lib/derive'

// Ciambella partite vinte / perse + legenda e set vinti.
export function WinLossCard({ s }: { s: DashboardStats }) {
  return (
    <div className="card" style={{ padding: 22 }}>
      <div className="lbl" style={{ marginBottom: 14 }}>Partite vinte / perse</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <svg viewBox="0 0 120 120" style={{ width: 112, height: 112, flex: 'none' }}>
          <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(27,42,74,.1)" strokeWidth="8" />
          <circle cx="60" cy="60" r="50" fill="none" stroke="#FF6B35" strokeWidth="8" strokeLinecap="round" strokeDasharray={s.donutDash} transform="rotate(-90 60 60)" style={{ transition: 'stroke-dasharray .8s ease' }} />
          <text x="60" y="58" textAnchor="middle" className="num" fontSize="24" fill="#1B2A4A">{s.winPct}%</text>
          <text x="60" y="76" textAnchor="middle" fontFamily="Nunito Sans" fontSize="10" fontWeight="700" fill="rgba(27,42,74,.42)">VINTE</text>
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: '#FF6B35' }} />
            <span className="num" style={{ fontSize: 20 }}>{s.won}</span>
            <span className="lbl">vinte</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: 'rgba(27,42,74,.18)' }} />
            <span className="num" style={{ fontSize: 20 }}>{s.lost}</span>
            <span className="lbl">perse</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, paddingTop: 8, borderTop: '1px solid rgba(27,42,74,.08)' }}>
            <span className="num" style={{ fontSize: 20 }}>{s.setPct}%</span>
            <span className="lbl">set vinti</span>
          </div>
        </div>
      </div>
    </div>
  )
}
