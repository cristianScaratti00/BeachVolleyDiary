import type { TorneoCard } from '../../lib/derive'
import { SectionTitle, EmptyCard, InlineLink } from '../ui'

// Lista "Ultimi tornei" con link "Vedi tutti".
export function RecentTornei({ recent, onOpenTorneo, goTornei }: { recent: TorneoCard[]; onOpenTorneo: (id: string) => void; goTornei: () => void }) {
  return (
    <>
      <SectionTitle
        size={19}
        action={<div className="chip" style={{ font: "700 13px 'Nunito Sans'", color: '#FF6B35', cursor: 'pointer' }} onClick={goTornei}>Vedi tutti →</div>}
      >
        Ultimi tornei
      </SectionTitle>
      {recent.length === 0 ? (
        <EmptyCard>Ancora nessun torneo. <InlineLink onClick={goTornei}>Vai ai tornei →</InlineLink></EmptyCard>
      ) : (
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
      )}
    </>
  )
}
