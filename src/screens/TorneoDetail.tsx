import type { TorneoDetailData } from '../lib/derive'
import { BackLink, Badge, StatGrid, StatTile, SectionTitle, MatchRow, EmptyCard, InlineLink, MUTED } from '../components/ui'

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

interface TorneoDetailProps {
  t: TorneoDetailData
  goBack: () => void
  onEdit: () => void
  onAddPartita: () => void
  onOpenMatch: (id: string) => void
  onAddFoto: () => void
  onDeleteFoto: (photoId: string) => void
  canAddFoto: boolean
  onShareStory: () => void
  canShareStory: boolean
}

export default function TorneoDetail({ t, goBack, onEdit, onAddPartita, onOpenMatch, onAddFoto, onDeleteFoto, canAddFoto, onShareStory, canShareStory }: TorneoDetailProps) {
  const removeFoto = (id: string) => {
    if (window.confirm('Vuoi eliminare questa foto? L’operazione non è reversibile.')) onDeleteFoto(id)
  }
  return (
    <div style={{ animation: 'pop .32s ease both' }}>
      <BackLink onClick={goBack}>← Tornei</BackLink>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', paddingBottom: 22, borderBottom: '1px solid rgba(27,42,74,.1)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: t.dot }} />
            <div className="lbl" style={{ letterSpacing: '1px' }}>{t.category}</div>
          </div>
          <div className="num" style={{ fontSize: 'clamp(24px,4vw,34px)', fontWeight: 500, letterSpacing: '-.5px', marginTop: 8 }}>{t.name}</div>
          <div style={{ font: "600 13.5px 'Nunito Sans'", color: MUTED, marginTop: 4 }}>{t.meta}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ font: "700 13px 'Nunito Sans'", padding: '8px 15px', borderRadius: 10, background: t.badgeBg, color: t.badgeColor }}>{t.badge}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <div className="chip" onClick={onShareStory} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, font: "700 12px 'Nunito Sans'", padding: '8px 14px', borderRadius: 9, color: '#fff', cursor: 'pointer', background: 'linear-gradient(45deg,#F58529,#DD2A7B 55%,#8134AF)', boxShadow: '0 4px 14px -5px rgba(221,42,123,.55)' }}>
              <IgGlyph /> Storia
              {!canShareStory && <Badge tone="onColor" size="sm">Premium</Badge>}
            </div>
            <div className="chip" onClick={onEdit} style={{ font: "700 12px 'Nunito Sans'", padding: '8px 13px', borderRadius: 9, border: '1px solid rgba(27,42,74,.18)', color: '#1B2A4A', cursor: 'pointer' }}>Modifica</div>
            <div className="chip" onClick={onAddPartita} style={{ font: "700 12px 'Nunito Sans'", padding: '8px 13px', borderRadius: 9, background: '#1B2A4A', color: '#fff', cursor: 'pointer' }}>＋ Partita</div>
          </div>
        </div>
      </div>

      <StatGrid min={120}>
        <StatTile value={t.record} label="record" color="#FF6B35" valueSize={24} pad="16px 18px" />
        <StatTile value={t.winPct + '%'} label="vittorie" valueSize={24} pad="16px 18px" />
        <StatTile value={t.setStr} label="set" valueSize={24} pad="16px 18px" />
        <StatTile value={t.diffStr} label="differenziale" valueSize={24} pad="16px 18px" />
      </StatGrid>

      <SectionTitle>Partite</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {t.matches.map((m) => (
          <MatchRow
            key={m.id}
            onClick={() => onOpenMatch(m.id)}
            esitoShort={m.esitoShort}
            esitoColor={m.esitoColor}
            primary={`${m.phase} · vs ${m.opponents}`}
            secondary={`con ${m.partnerName}`}
            setChips={m.setChips}
            note={m.hasNote ? m.note : undefined}
          />
        ))}
        {t.noMatches && (
          <EmptyCard>
            Nessuna partita ancora. <InlineLink onClick={onAddPartita}>Aggiungine una →</InlineLink>
          </EmptyCard>
        )}
      </div>

      <SectionTitle
        action={
          <div className="chip" onClick={onAddFoto} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, font: "700 12px 'Nunito Sans'", padding: '8px 13px', borderRadius: 9, border: '1px solid rgba(27,42,74,.18)', color: '#1B2A4A', cursor: 'pointer' }}>
            ＋ Foto
            {!canAddFoto && <Badge tone="premium">Premium</Badge>}
          </div>
        }
      >
        Foto
      </SectionTitle>
      {t.hasPhotos ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 12 }}>
          {t.photos.map((ph, i) => (
            <div key={ph.id || i} style={{ aspectRatio: '1', borderRadius: 12, background: ph.color, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: 11 }}>
              {ph.url ? (
                <img src={ph.url} alt={ph.caption} loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg,rgba(255,255,255,.1) 0 8px,transparent 8px 16px)' }} />
              )}
              <div
                className="chip"
                onClick={(e) => { e.stopPropagation(); removeFoto(ph.id) }}
                title="Elimina foto"
                style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 8, background: 'rgba(27,42,74,.62)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /></svg>
              </div>
              {ph.caption && <div style={{ position: 'relative', font: "700 11px 'Nunito Sans'", color: '#fff', textShadow: '0 1px 5px rgba(0,0,0,.6)' }}>{ph.caption}</div>}
            </div>
          ))}
        </div>
      ) : (
        <EmptyCard pad={24}>
          Nessuna foto per questo torneo. <InlineLink onClick={onAddFoto}>Aggiungine una →</InlineLink>
        </EmptyCard>
      )}
    </div>
  )
}
