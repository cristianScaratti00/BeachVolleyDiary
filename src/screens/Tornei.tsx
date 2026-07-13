import type { TorneiListData } from '../lib/derive'
import { PageHeader, Button, Badge, StatFooter, EmptyCard, InlineLink, MUTED } from '../components/ui'

interface TorneiProps {
  list: TorneiListData
  onOpenTorneo: (id: string) => void
  onNewTorneo: () => void
  onQuickTorneo: () => void
  onAssistant: () => void
  canAssistant: boolean
}

export default function Tornei({ list, onOpenTorneo, onNewTorneo, onQuickTorneo, onAssistant, canAssistant }: TorneiProps) {
  const { tornei, tPlayed, podi, bestPlacement } = list
  return (
    <div style={{ animation: 'pop .32s ease both' }}>
      <PageHeader
        title="Tornei"
        subtitle={`${tPlayed} tornei · ${podi} podi · miglior piazzamento ${bestPlacement}`}
        actions={
          <>
            <Button variant="assistant" onClick={onAssistant} style={{ padding: '11px 15px', gap: 6 }}>
              ✨ Assistente
              {!canAssistant && <Badge tone="onColor" size="sm" />}
            </Button>
            <Button variant="outline" onClick={onQuickTorneo} style={{ background: '#F2F0EC', border: 'none', padding: '11px 15px', gap: 6 }}>⚡ Rapido</Button>
            <Button variant="dark" onClick={onNewTorneo}>＋ Nuovo torneo</Button>
          </>
        }
      />

      {tornei.length === 0 ? (
        <div style={{ marginTop: 22 }}>
          <EmptyCard>Nessun torneo ancora. <InlineLink onClick={onNewTorneo}>Crea il primo torneo →</InlineLink></EmptyCard>
        </div>
      ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,300px),1fr))', gap: 14, marginTop: 22 }}>
        {tornei.map((t) => (
          <div key={t.id} className="card lift" onClick={() => onOpenTorneo(t.id)} style={{ padding: 20, cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.dot }} />
                <div className="lbl" style={{ letterSpacing: '1px' }}>{t.category}</div>
                {t.shared && <Badge tone="dark" size="sm">Condiviso</Badge>}
              </div>
              <span style={{ font: "700 12px 'Nunito Sans'", padding: '5px 11px', borderRadius: 8, background: t.badgeBg, color: t.badgeColor }}>{t.badge}</span>
            </div>
            <div className="num" style={{ fontSize: 19, fontWeight: 500, marginTop: 14, letterSpacing: '-.3px' }}>{t.name}</div>
            <div style={{ font: "600 12.5px 'Nunito Sans'", color: MUTED, marginTop: 3 }}>{t.meta}</div>
            <StatFooter
              gap={22}
              valueSize={17}
              items={[
                { value: t.record, label: 'record', color: '#FF6B35' },
                { value: t.winPct + '%', label: 'vittorie' },
                { value: t.matchCount, label: 'partite' },
              ]}
            />
          </div>
        ))}
      </div>
      )}
    </div>
  )
}
