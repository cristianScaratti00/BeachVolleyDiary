import type { DiaryEntry } from '../lib/derive'
import { PageHeader, Button, EmptyCard, InlineLink } from '../components/ui'

interface DiarioProps {
  entries: DiaryEntry[]
  onOpenTorneo: (id: string) => void
  onInstagramStory: (id: string) => void
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

export default function Diario({ entries, onOpenTorneo, onInstagramStory, onNewTorneo }: DiarioProps) {
  return (
    <div style={{ animation: 'pop .32s ease both' }}>
      <PageHeader
        title="Diario"
        subtitle={`${entries.length} ${entries.length === 1 ? 'torneo' : 'tornei'} nel diario`}
        actions={<Button variant="dark" onClick={onNewTorneo}>＋ Nuovo torneo</Button>}
      />

      {entries.length === 0 ? (
        <div style={{ marginTop: 22 }}>
          <EmptyCard pad={30}>
            Il tuo diario è vuoto. <InlineLink onClick={onNewTorneo}>Crea il primo torneo →</InlineLink>
          </EmptyCard>
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
