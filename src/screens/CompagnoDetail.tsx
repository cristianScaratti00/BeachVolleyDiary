import type { CSSProperties } from 'react'
import type { CompagnoDetailData } from '../lib/derive'

const statCell: CSSProperties = { background: '#fff', padding: 18 }

interface CompagnoDetailProps {
  cp: CompagnoDetailData
  goBack: () => void
  onOpenMatch: (id: string) => void
}

export default function CompagnoDetail({ cp, goBack, onOpenMatch }: CompagnoDetailProps) {
  return (
    <div style={{ animation: 'pop .32s ease both' }}>
      <div className="chip" onClick={goBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, font: "700 13px 'Nunito Sans'", color: 'rgba(27,42,74,.55)', cursor: 'pointer', marginBottom: 18 }}>← Compagni</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', paddingBottom: 22, borderBottom: '1px solid rgba(27,42,74,.1)' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#1B2A4A', display: 'flex', alignItems: 'center', justifyContent: 'center', font: "600 26px 'Space Grotesk'", color: '#fff', flex: 'none' }}>{cp.initial}</div>
        <div>
          <div className="num" style={{ fontSize: 30, fontWeight: 500, letterSpacing: '-.5px' }}>{cp.name}</div>
          <div style={{ font: "600 14px 'Nunito Sans'", color: 'rgba(27,42,74,.55)' }}>{cp.played} partite insieme · {cp.won} vinte</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 1, background: 'rgba(27,42,74,.1)', border: '1px solid rgba(27,42,74,.1)', borderRadius: 12, overflow: 'hidden', marginTop: 20 }}>
        <div style={statCell}><div className="num" style={{ fontSize: 30, color: '#FF6B35' }}>{cp.winPct}%</div><div className="lbl" style={{ marginTop: 4 }}>win rate</div></div>
        <div style={statCell}><div className="num" style={{ fontSize: 30 }}>{cp.setPct}%</div><div className="lbl" style={{ marginTop: 4 }}>set vinti</div></div>
        <div style={statCell}><div className="num" style={{ fontSize: 30 }}>{cp.diffStr}</div><div className="lbl" style={{ marginTop: 4 }}>differenziale</div></div>
        <div style={statCell}><div className="num" style={{ fontSize: 30 }}>{cp.streak}</div><div className="lbl" style={{ marginTop: 4 }}>serie record</div></div>
      </div>

      <div className="num" style={{ fontSize: 18, fontWeight: 500, margin: '26px 0 12px' }}>Partite insieme</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {cp.matches.map((m) => (
          <div key={m.id} className="card lift" onClick={() => onOpenMatch(m.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '14px 16px', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${m.esitoColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', font: "700 10px 'Space Grotesk'", color: m.esitoColor }}>{m.esitoShort}</div>
              <div>
                <div style={{ font: "700 13.5px 'Nunito Sans'" }}>{m.tournamentName}</div>
                <div style={{ font: "600 11.5px 'Nunito Sans'", color: 'rgba(27,42,74,.5)' }}>{m.phase} · vs {m.opponents}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 7 }}>
              {m.setChips.map((c, i) => <span key={i} className="num" style={{ fontSize: 12, padding: '5px 9px', borderRadius: 7, background: c.bg, color: c.color }}>{c.txt}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
