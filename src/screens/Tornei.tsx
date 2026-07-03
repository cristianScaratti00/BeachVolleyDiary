import type { TorneiListData } from '../lib/derive'

interface TorneiProps {
  list: TorneiListData
  onOpenTorneo: (id: string) => void
  onNewTorneo: () => void
  onQuickTorneo: () => void
}

export default function Tornei({ list, onOpenTorneo, onNewTorneo, onQuickTorneo }: TorneiProps) {
  const { tornei, tPlayed, podi, bestPlacement } = list
  return (
    <div style={{ animation: 'pop .32s ease both' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, paddingBottom: 22, borderBottom: '1px solid rgba(27,42,74,.1)' }}>
        <div>
          <div className="num" style={{ fontSize: 'clamp(26px,4vw,34px)', fontWeight: 500, letterSpacing: '-.5px' }}>Tornei</div>
          <div style={{ font: "600 14px 'Nunito Sans'", color: 'rgba(27,42,74,.55)', marginTop: 4 }}>{tPlayed} tornei · {podi} podi · miglior piazzamento {bestPlacement}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div className="chip" onClick={onQuickTorneo} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FF6B35', color: '#fff', padding: '11px 15px', borderRadius: 11, font: "700 13.5px 'Nunito Sans'", cursor: 'pointer' }}>⚡ Rapido</div>
          <div className="chip" onClick={onNewTorneo} style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#1B2A4A', color: '#fff', padding: '11px 16px', borderRadius: 11, font: "700 13.5px 'Nunito Sans'", cursor: 'pointer' }}>＋ Nuovo torneo</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,300px),1fr))', gap: 14, marginTop: 22 }}>
        {tornei.map((t) => (
          <div key={t.id} className="card lift" onClick={() => onOpenTorneo(t.id)} style={{ padding: 20, cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.dot }} />
                <div className="lbl" style={{ letterSpacing: '1px' }}>{t.category}</div>
              </div>
              <span style={{ font: "700 12px 'Nunito Sans'", padding: '5px 11px', borderRadius: 8, background: t.badgeBg, color: t.badgeColor }}>{t.badge}</span>
            </div>
            <div className="num" style={{ fontSize: 19, fontWeight: 500, marginTop: 14, letterSpacing: '-.3px' }}>{t.name}</div>
            <div style={{ font: "600 12.5px 'Nunito Sans'", color: 'rgba(27,42,74,.5)', marginTop: 3 }}>{t.meta}</div>
            <div style={{ display: 'flex', gap: 22, marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(27,42,74,.08)' }}>
              <div><div className="num" style={{ fontSize: 17, color: '#FF6B35' }}>{t.record}</div><div className="lbl">record</div></div>
              <div><div className="num" style={{ fontSize: 17 }}>{t.winPct}%</div><div className="lbl">vittorie</div></div>
              <div><div className="num" style={{ fontSize: 17 }}>{t.matchCount}</div><div className="lbl">partite</div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
