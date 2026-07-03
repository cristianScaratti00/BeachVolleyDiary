import type { CSSProperties } from 'react'
import type { TorneoDetailData } from '../lib/derive'

const statCell: CSSProperties = { background: '#fff', padding: '16px 18px' }

const heroStat = (val: string, label: string) => (
  <div style={statCell}>
    <div className="num" style={{ fontSize: 24 }}>{val}</div>
    <div className="lbl" style={{ marginTop: 4 }}>{label}</div>
  </div>
)

interface TorneoDetailProps {
  t: TorneoDetailData
  goBack: () => void
  onEdit: () => void
  onAddPartita: () => void
  onOpenMatch: (id: string) => void
}

export default function TorneoDetail({ t, goBack, onEdit, onAddPartita, onOpenMatch }: TorneoDetailProps) {
  return (
    <div style={{ animation: 'pop .32s ease both' }}>
      <div className="chip" onClick={goBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, font: "700 13px 'Nunito Sans'", color: 'rgba(27,42,74,.55)', cursor: 'pointer', marginBottom: 18 }}>← Tornei</div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', paddingBottom: 22, borderBottom: '1px solid rgba(27,42,74,.1)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: t.dot }} />
            <div className="lbl" style={{ letterSpacing: '1px' }}>{t.category}</div>
          </div>
          <div className="num" style={{ fontSize: 'clamp(24px,4vw,34px)', fontWeight: 500, letterSpacing: '-.5px', marginTop: 8 }}>{t.name}</div>
          <div style={{ font: "600 13.5px 'Nunito Sans'", color: 'rgba(27,42,74,.55)', marginTop: 4 }}>{t.meta}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ font: "700 13px 'Nunito Sans'", padding: '8px 15px', borderRadius: 10, background: t.badgeBg, color: t.badgeColor }}>{t.badge}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="chip" onClick={onEdit} style={{ font: "700 12px 'Nunito Sans'", padding: '8px 13px', borderRadius: 9, border: '1px solid rgba(27,42,74,.18)', color: '#1B2A4A', cursor: 'pointer' }}>Modifica</div>
            <div className="chip" onClick={onAddPartita} style={{ font: "700 12px 'Nunito Sans'", padding: '8px 13px', borderRadius: 9, background: '#1B2A4A', color: '#fff', cursor: 'pointer' }}>＋ Partita</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 1, background: 'rgba(27,42,74,.1)', border: '1px solid rgba(27,42,74,.1)', borderRadius: 12, overflow: 'hidden', marginTop: 20 }}>
        <div style={statCell}><div className="num" style={{ fontSize: 24, color: '#FF6B35' }}>{t.record}</div><div className="lbl" style={{ marginTop: 4 }}>record</div></div>
        {heroStat(t.winPct + '%', 'vittorie')}
        {heroStat(t.setStr, 'set')}
        {heroStat(t.diffStr, 'differenziale')}
      </div>

      <div className="num" style={{ fontSize: 18, fontWeight: 500, margin: '26px 0 12px' }}>Partite</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {t.matches.map((m) => (
          <div key={m.id} className="card lift" onClick={() => onOpenMatch(m.id)} style={{ padding: '15px 18px', cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', border: `2px solid ${m.esitoColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', font: "700 11px 'Space Grotesk'", color: m.esitoColor, flex: 'none' }}>{m.esitoShort}</div>
                <div>
                  <div style={{ font: "700 14px 'Nunito Sans'" }}>{m.phase} · vs {m.opponents}</div>
                  <div style={{ font: "600 12px 'Nunito Sans'", color: 'rgba(27,42,74,.5)' }}>con {m.partnerName}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 7 }}>
                {m.setChips.map((c, i) => <span key={i} className="num" style={{ fontSize: 13, padding: '5px 10px', borderRadius: 8, background: c.bg, color: c.color }}>{c.txt}</span>)}
              </div>
            </div>
            {m.hasNote && <div style={{ font: "600 12.5px 'Nunito Sans'", color: 'rgba(27,42,74,.5)', marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(27,42,74,.07)' }}>{m.note}</div>}
          </div>
        ))}
        {t.noMatches && (
          <div className="card" style={{ padding: 28, textAlign: 'center', color: 'rgba(27,42,74,.5)', font: "700 14px 'Nunito Sans'" }}>
            Nessuna partita ancora. <span className="chip" style={{ color: '#FF6B35', cursor: 'pointer' }} onClick={onAddPartita}>Aggiungine una →</span>
          </div>
        )}
      </div>

      {t.hasPhotos && (
        <>
          <div className="num" style={{ fontSize: 18, fontWeight: 500, margin: '26px 0 12px' }}>Foto</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 12 }}>
            {t.photos.map((ph, i) => (
              <div key={i} style={{ aspectRatio: '1', borderRadius: 12, background: ph.color, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: 11 }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg,rgba(255,255,255,.1) 0 8px,transparent 8px 16px)' }} />
                <div style={{ position: 'relative', font: "700 11px 'Nunito Sans'", color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,.25)' }}>{ph.caption}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
