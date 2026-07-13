import type { CompagnoDetailData } from '../lib/derive'
import { BackLink, Avatar, StatGrid, StatTile, SectionTitle, MatchRow, MUTED } from '../components/ui'

interface CompagnoDetailProps {
  cp: CompagnoDetailData
  goBack: () => void
  onOpenMatch: (id: string) => void
}

export default function CompagnoDetail({ cp, goBack, onOpenMatch }: CompagnoDetailProps) {
  return (
    <div style={{ animation: 'pop .32s ease both' }}>
      <BackLink onClick={goBack}>← Compagni</BackLink>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', paddingBottom: 22, borderBottom: '1px solid rgba(27,42,74,.1)' }}>
        <Avatar initial={cp.initial} size={64} font={26} />
        <div>
          <div className="num" style={{ fontSize: 30, fontWeight: 500, letterSpacing: '-.5px' }}>{cp.name}</div>
          <div style={{ font: "600 14px 'Nunito Sans'", color: MUTED }}>{cp.played} partite insieme · {cp.won} vinte</div>
        </div>
      </div>

      <StatGrid>
        <StatTile value={cp.winPct + '%'} label="win rate" color="#FF6B35" />
        <StatTile value={cp.setPct + '%'} label="set vinti" />
        <StatTile value={cp.diffStr} label="differenziale" />
        <StatTile value={cp.streak} label="serie record" />
      </StatGrid>

      <SectionTitle>Partite insieme</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {cp.matches.map((m) => (
          <MatchRow
            key={m.id}
            size="sm"
            onClick={() => onOpenMatch(m.id)}
            esitoShort={m.esitoShort}
            esitoColor={m.esitoColor}
            primary={m.tournamentName}
            secondary={`${m.phase} · vs ${m.opponents}`}
            setChips={m.setChips}
          />
        ))}
      </div>
    </div>
  )
}
