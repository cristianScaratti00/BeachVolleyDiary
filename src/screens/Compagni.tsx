import type { CompagnoCard } from '../lib/derive'
import { PageHeader, Button, Avatar, StatFooter, MUTED } from '../components/ui'

interface CompagniProps {
  compagni: CompagnoCard[]
  onOpenCompagno: (id: string) => void
  onNewCompagno: () => void
}

export default function Compagni({ compagni, onOpenCompagno, onNewCompagno }: CompagniProps) {
  return (
    <div style={{ animation: 'pop .32s ease both' }}>
      <PageHeader
        title="Compagni"
        subtitle="Con chi giochi meglio"
        actions={<Button variant="dark" onClick={onNewCompagno}>＋ Nuovo compagno</Button>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,250px),1fr))', gap: 14, marginTop: 22 }}>
        {compagni.map((p) => (
          <div key={p.id} className="card lift" onClick={() => onOpenCompagno(p.id)} style={{ padding: 22, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <Avatar initial={p.initial} />
              <div>
                <div style={{ font: "700 16px 'Nunito Sans'" }}>{p.name}</div>
                <div style={{ font: "600 12px 'Nunito Sans'", color: MUTED }}>{p.played} partite insieme</div>
              </div>
            </div>
            <StatFooter
              gap={20}
              mt={18}
              items={[
                { value: p.winPct + '%', label: 'vittorie', color: '#FF6B35' },
                { value: p.won, label: 'vinte' },
                { value: p.lost, label: 'perse', color: 'rgba(27,42,74,.4)' },
              ]}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
