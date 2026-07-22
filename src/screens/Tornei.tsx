import { useState } from 'react'
import { groupTorneiByFormat, splitUpcoming, torneiFormats } from '../lib/derive'
import type { TorneiListData, TorneoCard } from '../lib/derive'
import { PageHeader, SectionTitle, FilterChips, Button, Badge, StatFooter, EmptyCard, InlineLink, MUTED } from '../components/ui'

// Valore del filtro "nessun filtro". Non è un formato, quindi non può collidere
// con quelli di FORMATS.
const ALL = 'all'

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
  // Il filtro è puramente di presentazione: vive qui, non risale ad App.
  const [format, setFormat] = useState<string>(ALL)

  const formats = torneiFormats(tornei)
  // Con un formato solo il filtro non separerebbe niente: la riga sparisce.
  const showFilter = formats.length > 1
  // Se il formato scelto non esiste più (ultimo torneo di quel formato cancellato)
  // si ricade su "Tutti" invece di mostrare una pagina vuota.
  const active = showFilter && formats.includes(format) ? format : ALL
  const visible = active === ALL ? tornei : tornei.filter((t) => t.format === active)
  // Gli imminenti restano in cima e non raggruppati: raggruppando e basta, un
  // torneo di domani finirebbe sepolto sotto decine di passati del suo formato.
  const { upcoming, past } = splitUpcoming(visible)
  const groups = groupTorneiByFormat(past)

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
        <>
          {showFilter && (
            <FilterChips
              label="Filtra i tornei per formato"
              value={active}
              onChange={setFormat}
              options={[{ value: ALL, label: 'Tutti' }, ...formats.map((f) => ({ value: f, label: f }))]}
            />
          )}

          {upcoming.length > 0 && (
            <TorneiSection title="Prossimi tornei" tornei={upcoming} onOpenTorneo={onOpenTorneo} accent />
          )}

          {groups.map((g) => (
            <TorneiSection key={g.key} title={g.label} tornei={g.tornei} onOpenTorneo={onOpenTorneo} />
          ))}
        </>
      )}
    </div>
  )
}

// Intestazione + contatore + griglia. Il contatore sta accanto al titolo, non
// nello slot `action` di SectionTitle: quello allinea a destra (giusto per
// un'azione tipo "Vedi tutti"), e a 1120px staccherebbe il numero dal titolo che
// descrive. Stando dentro all'h2 finisce anche nel nome annunciato dagli
// screen reader ("2vs2, 4 tornei").
function TorneiSection({ title, tornei, onOpenTorneo, accent = false }: {
  title: string
  tornei: TorneoCard[]
  onOpenTorneo: (id: string) => void
  accent?: boolean
}) {
  return (
    <>
      <SectionTitle size={17}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {title}
          <SectionCount n={tornei.length} accent={accent} />
        </span>
      </SectionTitle>
      <TorneiGrid tornei={tornei} onOpenTorneo={onOpenTorneo} />
    </>
  )
}

// `accent` riprende i colori del badge da podio per dare risalto ai tornei
// ancora da giocare.
function SectionCount({ n, accent = false }: { n: number; accent?: boolean }) {
  return (
    <span style={{
      flex: 'none',
      font: "700 12px 'Nunito Sans'",
      padding: '4px 10px',
      borderRadius: 8,
      background: accent ? '#FFF1EA' : '#F2F0EC',
      color: accent ? '#C4501E' : MUTED,
    }}>
      {n === 1 ? '1 torneo' : `${n} tornei`}
    </span>
  )
}

// Griglia responsive, riusata da ogni sezione. Le colonne scendono a una sola
// sotto i 300px + gutter, quindi su mobile non c'è mai scroll orizzontale.
// Niente marginTop: i 12px sotto a SectionTitle sono già la distanza voluta.
function TorneiGrid({ tornei, onOpenTorneo }: { tornei: TorneoCard[]; onOpenTorneo: (id: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,300px),1fr))', gap: 14 }}>
      {tornei.map((t) => (
        <TorneoCardView key={t.id} t={t} onOpen={() => onOpenTorneo(t.id)} />
      ))}
    </div>
  )
}

// Card torneo: pallino categoria, badge piazzamento, nome, meta e footer stats.
function TorneoCardView({ t, onOpen }: { t: TorneoCard; onOpen: () => void }) {
  return (
    <div
      className="card lift"
      role="button"
      tabIndex={0}
      aria-label={`Apri il torneo ${t.name}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        // Una card non è un `button`: Invio e Spazio vanno gestiti a mano,
        // altrimenti da tastiera la pagina si attraversa senza poterla aprire.
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() }
      }}
      style={{ padding: 20, cursor: 'pointer' }}
    >
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
  )
}
