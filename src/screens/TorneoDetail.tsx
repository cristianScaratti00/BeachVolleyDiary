import type { CSSProperties } from 'react'
import type { TorneoDetailData } from '../lib/derive'

// Glifo Instagram (line-icon, eredita currentColor).
function IgGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}

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
  onAddFoto: () => void
  canAddFoto: boolean
  onShareStory: () => void
  canShareStory: boolean
}

export default function TorneoDetail({ t, goBack, onEdit, onAddPartita, onOpenMatch, onAddFoto, canAddFoto, onShareStory, canShareStory }: TorneoDetailProps) {
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
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <div className="chip" onClick={onShareStory} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, font: "700 12px 'Nunito Sans'", padding: '8px 14px', borderRadius: 9, color: '#fff', cursor: 'pointer', background: 'linear-gradient(45deg,#F58529,#DD2A7B 55%,#8134AF)', boxShadow: '0 4px 14px -5px rgba(221,42,123,.55)' }}>
              <IgGlyph /> Storia
              {!canShareStory && <span style={{ font: "800 8px 'Nunito Sans'", letterSpacing: '.4px', textTransform: 'uppercase', padding: '2px 5px', borderRadius: 4, background: 'rgba(255,255,255,.28)', color: '#fff' }}>Premium</span>}
            </div>
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, margin: '26px 0 12px' }}>
        <div className="num" style={{ fontSize: 18, fontWeight: 500 }}>Foto</div>
        <div className="chip" onClick={onAddFoto} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, font: "700 12px 'Nunito Sans'", padding: '8px 13px', borderRadius: 9, border: '1px solid rgba(27,42,74,.18)', color: '#1B2A4A', cursor: 'pointer' }}>
          ＋ Foto
          {!canAddFoto && <span style={{ font: "800 8.5px 'Nunito Sans'", letterSpacing: '.4px', textTransform: 'uppercase', padding: '2px 6px', borderRadius: 5, background: '#FFF1EA', color: '#FF6B35' }}>Premium</span>}
        </div>
      </div>
      {t.hasPhotos ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 12 }}>
          {t.photos.map((ph, i) => (
            <div key={i} style={{ aspectRatio: '1', borderRadius: 12, background: ph.color, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: 11 }}>
              {ph.url ? (
                <img src={ph.url} alt={ph.caption} loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg,rgba(255,255,255,.1) 0 8px,transparent 8px 16px)' }} />
              )}
              {ph.caption && <div style={{ position: 'relative', font: "700 11px 'Nunito Sans'", color: '#fff', textShadow: '0 1px 5px rgba(0,0,0,.6)' }}>{ph.caption}</div>}
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: 24, textAlign: 'center', color: 'rgba(27,42,74,.5)', font: "700 13.5px 'Nunito Sans'" }}>
          Nessuna foto per questo torneo. <span className="chip" style={{ color: '#FF6B35', cursor: 'pointer' }} onClick={onAddFoto}>Aggiungine una →</span>
        </div>
      )}
    </div>
  )
}
