import type { CSSProperties } from 'react'
import type { DashboardStats } from '../../lib/derive'
import { EmptyNote } from '../ui'

// CSSProperties non ammette custom properties: le abilitiamo per lo stile della polyline.
type StyleWithVars = CSSProperties & { [key: `--${string}`]: string | number }

// Grafico a linea: andamento del win rate mese per mese.
export function TrendCard({ s }: { s: DashboardStats }) {
  return (
    <div className="card" style={{ padding: '22px 22px 14px', marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <div className="lbl">Andamento win rate per mese</div>
        {s.trendHasData && <div style={{ font: "700 13px 'Nunito Sans'", color: s.trendColor }}>{s.trendLabel}</div>}
      </div>
      {s.trendHasData ? (
        <svg viewBox="0 0 340 152" style={{ width: '100%', height: 176, marginTop: 12, overflow: 'visible' }}>
          <line x1="20" y1="24" x2="320" y2="24" stroke="rgba(27,42,74,.07)" />
          <line x1="20" y1="76" x2="320" y2="76" stroke="rgba(27,42,74,.07)" />
          <line x1="20" y1="128" x2="320" y2="128" stroke="rgba(27,42,74,.14)" />
          <text x="2" y="27" fontFamily="Nunito Sans" fontSize="9" fontWeight="700" fill="rgba(27,42,74,.32)">100</text>
          <text x="5" y="79" fontFamily="Nunito Sans" fontSize="9" fontWeight="700" fill="rgba(27,42,74,.32)">50</text>
          <text x="8" y="131" fontFamily="Nunito Sans" fontSize="9" fontWeight="700" fill="rgba(27,42,74,.32)">0</text>
          <polygon points={s.trendArea} fill="#FF6B35" opacity="0.09" />
          <polyline
            points={s.trendLine}
            fill="none"
            stroke="#FF6B35"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={100}
            style={{ '--len': 100, strokeDasharray: 100, animation: 'dash 1.2s ease .1s both' } as StyleWithVars}
          />
          {s.trendPts.map((pt, i) => <circle key={i} cx={pt.x} cy={pt.y} r="4" fill="#fff" stroke="#FF6B35" strokeWidth="2.5" />)}
          {s.trendPts.map((pt, i) => <text key={'v' + i} x={pt.x} y={pt.y - 9} textAnchor="middle" className="num" fontSize="10" fill="#1B2A4A">{pt.pct}%</text>)}
          {s.trendPts.map((pt, i) => <text key={'l' + i} x={pt.x} y="147" textAnchor="middle" fontFamily="Nunito Sans" fontSize="10.5" fontWeight="700" fill="rgba(27,42,74,.4)">{pt.label}</text>)}
        </svg>
      ) : (
        <EmptyNote>Servono partite in almeno due mesi diversi per vedere l'andamento.</EmptyNote>
      )}
    </div>
  )
}
