import type { CompagnoCard } from '../lib/derive'

interface CompagniProps {
  compagni: CompagnoCard[]
  onOpenCompagno: (id: string) => void
  onNewCompagno: () => void
}

export default function Compagni({ compagni, onOpenCompagno, onNewCompagno }: CompagniProps) {
  return (
    <div style={{ animation: 'pop .32s ease both' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, paddingBottom: 22, borderBottom: '1px solid rgba(27,42,74,.1)' }}>
        <div>
          <div className="num" style={{ fontSize: 'clamp(26px,4vw,34px)', fontWeight: 500, letterSpacing: '-.5px' }}>Compagni</div>
          <div style={{ font: "600 14px 'Nunito Sans'", color: 'rgba(27,42,74,.55)', marginTop: 4 }}>Con chi giochi meglio</div>
        </div>
        <div className="chip" onClick={onNewCompagno} style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#1B2A4A', color: '#fff', padding: '11px 16px', borderRadius: 11, font: "700 13.5px 'Nunito Sans'", cursor: 'pointer' }}>＋ Nuovo compagno</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,250px),1fr))', gap: 14, marginTop: 22 }}>
        {compagni.map((p) => (
          <div key={p.id} className="card lift" onClick={() => onOpenCompagno(p.id)} style={{ padding: 22, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#1B2A4A', display: 'flex', alignItems: 'center', justifyContent: 'center', font: "600 20px 'Space Grotesk'", color: '#fff', flex: 'none' }}>{p.initial}</div>
              <div>
                <div style={{ font: "700 16px 'Nunito Sans'" }}>{p.name}</div>
                <div style={{ font: "600 12px 'Nunito Sans'", color: 'rgba(27,42,74,.5)' }}>{p.played} partite insieme</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 18, paddingTop: 16, borderTop: '1px solid rgba(27,42,74,.08)' }}>
              <div><div className="num" style={{ fontSize: 20, color: '#FF6B35' }}>{p.winPct}%</div><div className="lbl">vittorie</div></div>
              <div><div className="num" style={{ fontSize: 20 }}>{p.won}</div><div className="lbl">vinte</div></div>
              <div><div className="num" style={{ fontSize: 20, color: 'rgba(27,42,74,.4)' }}>{p.lost}</div><div className="lbl">perse</div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
