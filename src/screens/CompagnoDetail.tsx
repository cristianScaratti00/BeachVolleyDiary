import { useState } from 'react'
import type { CompagnoDetailData } from '../lib/derive'
import type { AppUser } from '../lib/models'
import { BackLink, Avatar, StatGrid, StatTile, SectionTitle, MatchRow, MUTED } from '../components/ui'

interface CompagnoDetailProps {
  cp: CompagnoDetailData
  goBack: () => void
  onOpenMatch: (id: string) => void
  linked: boolean
  onSearchUsers: (query: string) => Promise<AppUser[]>
  onLink: (userId: string) => Promise<{ ok: boolean; error?: string }>
  onUnlink: () => void
}

const searchInput = { width: '100%', border: '1px solid rgba(27,42,74,.16)', borderRadius: 10, padding: '11px 13px', font: "600 14px 'Nunito Sans'", background: '#fff' } as const

export default function CompagnoDetail({ cp, goBack, onOpenMatch, linked, onSearchUsers, onLink, onUnlink }: CompagnoDetailProps) {
  const [open, setOpen] = useState(false)
  const [users, setUsers] = useState<AppUser[] | null>(null)
  const [q, setQ] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [err, setErr] = useState('')

  const openPicker = async () => {
    setOpen(true)
    setErr('')
    setQ('')
    if (users === null) setUsers(await onSearchUsers(''))
  }

  const filtered = (users ?? []).filter((u) => {
    const s = q.trim().toLowerCase()
    return !s || u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s)
  })

  const pick = async (u: AppUser) => {
    if (busyId) return
    setErr('')
    setBusyId(u.id)
    const r = await onLink(u.id)
    setBusyId(null)
    if (!r.ok) setErr(r.error || 'Collegamento non riuscito.')
    else setOpen(false)
  }

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

      {/* collegamento del socio a un utente dell'app (condivisione tornei) */}
      <div className="card" style={{ marginTop: 16, padding: 16 }}>
        {linked ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ font: "700 13.5px 'Nunito Sans'", display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2FBF71' }} /> Collegato a un utente
              </div>
              <div style={{ font: "600 12px 'Nunito Sans'", color: MUTED, marginTop: 3 }}>I tornei giocati con questo socio sono condivisi con il suo account.</div>
            </div>
            <div className="chip" onClick={onUnlink} style={{ font: "700 12.5px 'Nunito Sans'", padding: '9px 14px', borderRadius: 10, border: '1px solid rgba(255,71,126,.4)', color: '#FF477E', cursor: 'pointer' }}>Scollega</div>
          </div>
        ) : open ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ font: "700 13.5px 'Nunito Sans'" }}>Collega «{cp.name}» a un utente</div>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca per nome…" autoFocus style={searchInput} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
              {users === null ? (
                <div style={{ font: "600 12.5px 'Nunito Sans'", color: MUTED, padding: '8px 2px' }}>Caricamento…</div>
              ) : filtered.length === 0 ? (
                <div style={{ font: "600 12.5px 'Nunito Sans'", color: MUTED, padding: '8px 2px' }}>Nessun utente trovato.</div>
              ) : (
                filtered.map((u) => (
                  <div key={u.id} className="row" onClick={() => pick(u)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 10px', borderRadius: 10, cursor: 'pointer', border: '1px solid rgba(27,42,74,.08)', opacity: busyId && busyId !== u.id ? 0.5 : 1 }}>
                    <Avatar initial={(u.name[0] || '?').toUpperCase()} size={34} font={14} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ font: "700 13.5px 'Nunito Sans'", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                      <div style={{ font: "600 11.5px 'Nunito Sans'", color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                    </div>
                    <span style={{ font: "700 12px 'Nunito Sans'", color: '#FF6B35', flex: 'none' }}>{busyId === u.id ? '…' : 'Collega'}</span>
                  </div>
                ))
              )}
            </div>
            {err && <div style={{ font: "700 12px 'Nunito Sans'", color: '#FF477E' }}>{err}</div>}
            <div className="chip" onClick={() => { setOpen(false); setErr('') }} style={{ alignSelf: 'flex-start', border: '1px solid rgba(27,42,74,.16)', color: '#1B2A4A', padding: '9px 14px', borderRadius: 10, font: "700 12.5px 'Nunito Sans'", cursor: 'pointer' }}>Annulla</div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ font: "600 12.5px 'Nunito Sans'", color: MUTED }}>Collega questo socio a un utente per condividere i tornei giocati insieme.</div>
            <div className="chip" onClick={openPicker} style={{ background: '#1B2A4A', color: '#fff', padding: '10px 15px', borderRadius: 10, font: "700 12.5px 'Nunito Sans'", cursor: 'pointer', flex: 'none' }}>🔗 Collega a un utente</div>
          </div>
        )}
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
