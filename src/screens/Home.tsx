import type { CSSProperties, ChangeEvent } from 'react'
import type { DashboardStats, TorneoCard } from '../lib/derive'
import type { Option } from '../lib/models'

// CSSProperties non ammette custom properties: le abilitiamo per lo stile della polyline.
type StyleWithVars = CSSProperties & { [key: `--${string}`]: string | number }

const cell: CSSProperties = { background: '#fff', padding: 20 }
const gridBox: CSSProperties = { display: 'grid', gap: 1, background: 'rgba(27,42,74,.1)', border: '1px solid rgba(27,42,74,.1)', borderRadius: 14, overflow: 'hidden' }

interface HomeFilters {
  fPartner: string
  fYear: string
  partnerOptions: Option[]
  yearOptions: string[]
  setFPartner: (v: string) => void
  setFYear: (v: string) => void
}

interface HomeProps {
  s: DashboardStats
  recent: TorneoCard[]
  filters: HomeFilters
  onOpenTorneo: (id: string) => void
  goTornei: () => void
  goCompagni: () => void
}

export default function Home({ s, recent, filters, onOpenTorneo, goTornei, goCompagni }: HomeProps) {
  const { fPartner, fYear, partnerOptions, yearOptions, setFPartner, setFYear } = filters
  const selectStyle: CSSProperties = { border: '1px solid rgba(27,42,74,.16)', background: '#fff', borderRadius: 10, padding: '9px 12px', font: "700 13px 'Nunito Sans'", color: '#1B2A4A', cursor: 'pointer' }
  return (
    <div style={{ animation: 'pop .32s ease both' }}>
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', paddingBottom: 24, borderBottom: '1px solid rgba(27,42,74,.1)' }}>
        <div>
          <div className="lbl">{s.periodLabel}</div>
          <div className="num" style={{ fontSize: 'clamp(28px,4vw,40px)', letterSpacing: '-1px', margin: '8px 0 6px', fontWeight: 500 }}>{s.headline}</div>
          <div style={{ font: "600 15px 'Nunito Sans'", color: 'rgba(27,42,74,.58)', maxWidth: 540 }}>{s.subline}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={fPartner} onChange={(e: ChangeEvent<HTMLSelectElement>) => setFPartner(e.target.value)} style={selectStyle}>
            <option value="all">Tutti i compagni</option>
            {partnerOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={fYear} onChange={(e: ChangeEvent<HTMLSelectElement>) => setFYear(e.target.value)} style={selectStyle}>
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* key numbers row */}
      <div style={{ ...gridBox, gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', marginTop: 22 }}>
        <div style={cell}><div className="num" style={{ fontSize: 40, color: '#FF6B35', lineHeight: 1 }}>{s.winPct}%</div><div className="lbl" style={{ marginTop: 6 }}>Vittorie · {s.won}/{s.played}</div></div>
        <div style={cell}><div className="num" style={{ fontSize: 40, lineHeight: 1 }}>{s.diffStr}</div><div className="lbl" style={{ marginTop: 6 }}>Differenziale punti</div></div>
        <div style={cell}><div className="num" style={{ fontSize: 40, lineHeight: 1 }}>{s.tWon}<span style={{ fontSize: 20, color: 'rgba(27,42,74,.3)' }}> / {s.tPlayed}</span></div><div className="lbl" style={{ marginTop: 6 }}>Tornei vinti · {s.podi} podi</div></div>
        <div style={cell}><div className="num" style={{ fontSize: 40, lineHeight: 1 }}>{s.streak}</div><div className="lbl" style={{ marginTop: 6 }}>Serie vittorie record</div></div>
      </div>

      {/* trend chart */}
      <div className="card" style={{ padding: '22px 22px 12px', marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
          <div className="lbl">Andamento vittorie nel tempo</div>
          <div style={{ font: "700 13px 'Nunito Sans'", color: s.trendColor }}>{s.trendLabel}</div>
        </div>
        <svg viewBox="0 0 340 150" style={{ width: '100%', height: 168, marginTop: 10, overflow: 'visible' }}>
          <line x1="14" y1="30" x2="326" y2="30" stroke="rgba(27,42,74,.07)" />
          <line x1="14" y1="85" x2="326" y2="85" stroke="rgba(27,42,74,.07)" />
          <line x1="14" y1="140" x2="326" y2="140" stroke="rgba(27,42,74,.14)" />
          {s.trendLine && <polyline points={s.trendLine} fill="none" stroke="#FF6B35" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ '--len': '520px', strokeDasharray: 520, animation: 'dash 1.4s ease .15s both' } as StyleWithVars} />}
          {s.trendPts.map((pt, i) => <circle key={i} cx={pt.x} cy={pt.y} r="4" fill="#fff" stroke="#FF6B35" strokeWidth="2.5" />)}
          {s.trendPts.map((pt, i) => <text key={i} x={pt.x} y="149" textAnchor="middle" fontFamily="Nunito Sans" fontSize="10.5" fontWeight="700" fill="rgba(27,42,74,.4)">{pt.label}</text>)}
        </svg>
      </div>

      {/* donut + bars */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, marginTop: 16 }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: '#FF6B35' }} /><span className="num" style={{ fontSize: 20 }}>{s.won}</span><span className="lbl">vinte</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: 'rgba(27,42,74,.18)' }} /><span className="num" style={{ fontSize: 20 }}>{s.lost}</span><span className="lbl">perse</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, paddingTop: 8, borderTop: '1px solid rgba(27,42,74,.08)' }}><span className="num" style={{ fontSize: 20 }}>{s.setPct}%</span><span className="lbl">set vinti</span></div>
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: 22 }}>
          <div className="lbl" style={{ marginBottom: 16 }}>Punti fatti vs subiti</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', font: "700 12px 'Nunito Sans'", marginBottom: 6 }}><span style={{ color: 'rgba(27,42,74,.55)' }}>Fatti</span><span className="num">{s.pf}</span></div>
              <div className="barwrap" style={{ height: 14, background: '#F2F0EC', borderRadius: 4, overflow: 'hidden' }}><div className="bar" style={{ height: '100%', width: s.barForW, background: '#FF6B35', borderRadius: 4, opacity: .92, transition: 'width .7s ease' }} /></div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', font: "700 12px 'Nunito Sans'", marginBottom: 6 }}><span style={{ color: 'rgba(27,42,74,.55)' }}>Subiti</span><span className="num">{s.pa}</span></div>
              <div className="barwrap" style={{ height: 14, background: '#F2F0EC', borderRadius: 4, overflow: 'hidden' }}><div className="bar" style={{ height: '100%', width: s.barAgW, background: '#1B2A4A', borderRadius: 4, opacity: .85, transition: 'width .7s ease' }} /></div>
            </div>
            <div style={{ display: 'flex', gap: 26, paddingTop: 14, borderTop: '1px solid rgba(27,42,74,.08)' }}>
              <div><div className="num" style={{ fontSize: 20 }}>{s.avgFor}</div><div className="lbl">media fatti</div></div>
              <div><div className="num" style={{ fontSize: 20 }}>{s.avgAg}</div><div className="lbl">media subiti</div></div>
            </div>
          </div>
        </div>
      </div>

      {/* result dist + per partner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, marginTop: 16 }}>
        <div className="card" style={{ padding: 22 }}>
          <div className="lbl" style={{ marginBottom: 18 }}>Distribuzione risultati</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 90, gap: 12 }}>
            {s.resultDist.map((r) => (
              <div key={r.label} className="barwrap" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, height: '100%', justifyContent: 'flex-end' }}>
                <div className="num" style={{ fontSize: 14, color: r.color }}>{r.count}</div>
                <div className="bar" style={{ width: '100%', maxWidth: 38, height: r.h, background: r.color, borderRadius: '5px 5px 2px 2px', opacity: .82 }} />
                <div style={{ font: "700 11px 'Nunito Sans'", color: 'rgba(27,42,74,.5)' }}>{r.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 24, marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(27,42,74,.08)' }}>
            <div><div className="num" style={{ fontSize: 18, color: '#FF6B35' }}>+{s.marginWin}</div><div className="lbl">margine medio vittoria</div></div>
            <div><div className="num" style={{ fontSize: 18, color: 'rgba(27,42,74,.45)' }}>−{s.marginLoss}</div><div className="lbl">margine medio sconfitta</div></div>
          </div>
        </div>
        <div className="card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="lbl">Win rate per compagno</div>
            <div className="chip" style={{ font: "700 12px 'Nunito Sans'", color: '#FF6B35', cursor: 'pointer' }} onClick={goCompagni}>Vedi tutti</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {s.partnerRows.map((p) => (
              <div key={p.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span style={{ font: "700 13px 'Nunito Sans'" }}>{p.name}</span><span className="num" style={{ fontSize: 14 }}>{p.winPct}%</span></div>
                <div style={{ height: 6, background: '#F2F0EC', borderRadius: 6, marginTop: 6, overflow: 'hidden' }}><div style={{ height: '100%', width: p.barW, background: '#FF6B35', borderRadius: 6, transition: 'width .6s ease' }} /></div>
                <div style={{ font: "600 11px 'Nunito Sans'", color: 'rgba(27,42,74,.42)', marginTop: 4 }}>{p.played} partite · {p.won} vinte</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* recent tornei */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '30px 0 14px' }}>
        <div className="num" style={{ fontSize: 19, fontWeight: 500 }}>Ultimi tornei</div>
        <div className="chip" style={{ font: "700 13px 'Nunito Sans'", color: '#FF6B35', cursor: 'pointer' }} onClick={goTornei}>Vedi tutti →</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid rgba(27,42,74,.1)', borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
        {recent.map((t) => (
          <div key={t.id} className="row" onClick={() => onOpenTorneo(t.id)} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '16px 18px', cursor: 'pointer', borderBottom: '1px solid rgba(27,42,74,.07)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.dot, flex: 'none' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: "700 14.5px 'Nunito Sans'", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
              <div style={{ font: "600 12px 'Nunito Sans'", color: 'rgba(27,42,74,.48)', marginTop: 1 }}>{t.meta}</div>
            </div>
            <div className="num" style={{ fontSize: 13, color: 'rgba(27,42,74,.5)', whiteSpace: 'nowrap' }}>{t.record}</div>
            <div style={{ font: "700 12px 'Nunito Sans'", padding: '5px 11px', borderRadius: 8, background: t.badgeBg, color: t.badgeColor, flex: 'none' }}>{t.badge}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
