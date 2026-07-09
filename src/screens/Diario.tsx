import type { CSSProperties } from 'react'
import type { DiaryEntry } from '../lib/derive'

interface DiarioProps {
  entries: DiaryEntry[]
  locked: boolean
  onOpenTorneo: (id: string) => void
  onInstagramStory: (id: string) => void
  onUpgrade: () => void
  onNewTorneo: () => void
}

// Glifo Instagram (line-icon, eredita currentColor).
function IgGlyph({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}

// Bottom-sheet card entry del diario.
function EntryCard({ e, onOpen, onStory }: { e: DiaryEntry; onOpen: () => void; onStory: () => void }) {
  return (
    <div className="card lift" onClick={onOpen} style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', display: 'flex' }}>
      {/* colonna data */}
      <div style={{ flex: 'none', width: 78, padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, borderRight: `1px solid rgba(27,42,74,.08)`, background: '#FBFAF7' }}>
        <div className="num" style={{ fontSize: 22, fontWeight: 600, lineHeight: 1, color: '#1B2A4A' }}>{e.day}</div>
        <div style={{ font: "800 10px 'Nunito Sans'", letterSpacing: '.5px', textTransform: 'uppercase', color: '#FF6B35' }}>{e.month}</div>
        <div style={{ font: "700 11px 'Nunito Sans'", color: 'rgba(27,42,74,.4)' }}>{e.year}</div>
        <div style={{ fontSize: 18, marginTop: 6 }}>{e.emoji}</div>
      </div>

      {/* contenuto */}
      <div style={{ flex: 1, minWidth: 0, padding: '15px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: e.accent, flex: 'none' }} />
            <div style={{ font: "700 15px 'Nunito Sans'", color: '#1B2A4A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</div>
          </div>
          <div style={{ flex: 'none', font: "700 11px 'Nunito Sans'", padding: '4px 9px', borderRadius: 8, background: e.badgeBg, color: e.badgeColor }}>{e.badge}</div>
        </div>

        <div style={{ font: "600 12.5px 'Nunito Sans'", color: 'rgba(27,42,74,.55)', lineHeight: 1.4 }}>{e.desc}</div>

        {e.photos.length > 0 && (
          <div style={{ display: 'flex', gap: 7, marginTop: 2 }}>
            {e.photos.map((ph, i) => (
              <div key={i} title={ph.caption} style={{ width: 46, height: 46, borderRadius: 10, background: ph.color, position: 'relative', overflow: 'hidden', flex: 'none' }}>
                {ph.url ? (
                  <img src={ph.url} alt={ph.caption} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg,rgba(255,255,255,.12) 0 7px,transparent 7px 14px)' }} />
                )}
              </div>
            ))}
            {e.morePhotos > 0 && (
              <div style={{ width: 46, height: 46, borderRadius: 10, background: '#F2F0EC', display: 'flex', alignItems: 'center', justifyContent: 'center', font: "700 12px 'Nunito Sans'", color: 'rgba(27,42,74,.5)', flex: 'none' }}>+{e.morePhotos}</div>
            )}
          </div>
        )}

        {/* CTA: storia Instagram (segnaposto, nessuna integrazione) */}
        <div style={{ display: 'flex', marginTop: 4 }}>
          <button
            onClick={(ev) => { ev.stopPropagation(); onStory() }}
            className="chip"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 13px', borderRadius: 10, border: 'none', cursor: 'pointer', color: '#fff', font: "700 12px 'Nunito Sans'", background: 'linear-gradient(45deg,#F58529,#DD2A7B 55%,#8134AF)' }}
          >
            <IgGlyph /> Storia Instagram
          </button>
        </div>
      </div>
    </div>
  )
}

// Card paywall mostrata agli utenti Base.
function PremiumGate({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="card" style={{ padding: 26, textAlign: 'center', border: '2px solid #FF6B35' }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: '#FFF1EA', color: '#FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center', font: "700 22px 'Space Grotesk'", margin: '0 auto 12px' }}>★</div>
      <div className="num" style={{ fontSize: 20, fontWeight: 600 }}>Il Diario è Premium</div>
      <div style={{ font: "600 13px 'Nunito Sans'", color: 'rgba(27,42,74,.6)', margin: '8px auto 0', maxWidth: 380, lineHeight: 1.45 }}>
        Rivivi i tuoi tornei in un diario con foto e condividili come storia su Instagram. Passa a Premium per sbloccarlo.
      </div>
      <button onClick={onUpgrade} className="chip" style={{ marginTop: 18, padding: '12px 22px', borderRadius: 11, border: 'none', cursor: 'pointer', background: '#FF6B35', color: '#fff', font: "700 14px 'Nunito Sans'" }}>Passa a Premium · €5</button>
    </div>
  )
}

const fadedPreview: CSSProperties = { filter: 'blur(3px)', opacity: 0.5, pointerEvents: 'none', userSelect: 'none' }

export default function Diario({ entries, locked, onOpenTorneo, onInstagramStory, onUpgrade, onNewTorneo }: DiarioProps) {
  return (
    <div style={{ animation: 'pop .32s ease both' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, paddingBottom: 22, borderBottom: '1px solid rgba(27,42,74,.1)' }}>
        <div>
          <div className="num" style={{ fontSize: 'clamp(26px,4vw,34px)', fontWeight: 500, letterSpacing: '-.5px' }}>Diario</div>
          <div style={{ font: "600 14px 'Nunito Sans'", color: 'rgba(27,42,74,.55)', marginTop: 4 }}>
            {locked ? 'Funzione Premium' : `${entries.length} ${entries.length === 1 ? 'torneo' : 'tornei'} nel diario`}
          </div>
        </div>
        {!locked && (
          <div className="chip" onClick={onNewTorneo} style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#1B2A4A', color: '#fff', padding: '11px 16px', borderRadius: 11, font: "700 13.5px 'Nunito Sans'", cursor: 'pointer' }}>＋ Nuovo torneo</div>
        )}
      </div>

      {locked ? (
        <div style={{ marginTop: 22 }}>
          <PremiumGate onUpgrade={onUpgrade} />
          {entries.length > 0 && (
            <div style={{ ...fadedPreview, display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18 }} aria-hidden="true">
              {entries.slice(0, 3).map((e) => (
                <EntryCard key={e.id} e={e} onOpen={() => {}} onStory={() => {}} />
              ))}
            </div>
          )}
        </div>
      ) : entries.length === 0 ? (
        <div className="card" style={{ marginTop: 22, padding: 30, textAlign: 'center', color: 'rgba(27,42,74,.5)', font: "700 14px 'Nunito Sans'" }}>
          Il tuo diario è vuoto. <span className="chip" style={{ color: '#FF6B35', cursor: 'pointer' }} onClick={onNewTorneo}>Crea il primo torneo →</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 22 }}>
          {entries.map((e) => (
            <EntryCard key={e.id} e={e} onOpen={() => onOpenTorneo(e.id)} onStory={() => onInstagramStory(e.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
