import type { Screen } from '../lib/models'
import { useAuth } from '../hooks/useAuth'
import NavIcon from './NavIcons'
import { BrandLockup } from './Logo'
import { Avatar } from './ui'

interface NavEntry { key: Screen; label: string }

const NAV: NavEntry[] = [
  { key: 'home', label: 'Dashboard' },
  { key: 'tornei', label: 'Tornei' },
  { key: 'compagni', label: 'Compagni' },
  { key: 'diario', label: 'Diario' },
]

interface SidebarProps {
  screen: Screen
  onNavigate: (screen: Screen) => void
  onNewPartita: () => void
  onNewTorneo: () => void
  onAssistant: () => void
  canAssistant: boolean
}

export default function Sidebar({ screen, onNavigate, onNewPartita, onNewTorneo, onAssistant, canAssistant }: SidebarProps) {
  const { session, logout } = useAuth()
  const initial = session?.name?.[0]?.toUpperCase() || '?'
  return (
    <aside style={{ width: 230, flex: 'none', height: '100vh', overflowY: 'auto', padding: '28px 16px', borderRight: '1px solid rgba(27,42,74,.09)', display: 'flex', flexDirection: 'column', gap: 2, background: '#FAF8F5' }}>
      <div style={{ padding: '2px 12px 26px' }}>
        <BrandLockup size={34} textSize={17} gap={11} />
      </div>

      {NAV.map((n) => {
        const active = screen === n.key
        return (
          <div
            key={n.key}
            className="nav"
            onClick={() => onNavigate(n.key)}
            style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', borderRadius: 10, cursor: 'pointer', font: "700 14px 'Nunito Sans'", color: active ? '#1B2A4A' : 'rgba(27,42,74,.4)', borderLeft: `2px solid ${active ? '#FF6B35' : 'transparent'}` }}
          >
            <NavIcon screen={n.key} size={19} />{n.label}
          </div>
        )
      })}

      <div style={{ flex: 1 }} />

      <div className="chip" onClick={onAssistant} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 11, cursor: 'pointer', background: 'linear-gradient(135deg,#FF6B35,#FF9558)', color: '#fff', font: "700 13.5px 'Nunito Sans'", boxShadow: '0 8px 20px -10px rgba(255,107,53,.8)' }}>
        ✨ Crea con l’assistente
        {!canAssistant && <span style={{ font: "800 8px 'Nunito Sans'", letterSpacing: '.4px', textTransform: 'uppercase', padding: '2px 5px', borderRadius: 4, background: 'rgba(255,255,255,.28)', color: '#fff' }}>Premium</span>}
      </div>
      <div className="chip" onClick={onNewPartita} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 11, cursor: 'pointer', background: '#1B2A4A', color: '#fff', font: "700 13.5px 'Nunito Sans'", marginTop: 8 }}>＋ Nuova partita</div>
      <div className="chip" onClick={onNewTorneo} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 11, cursor: 'pointer', border: '1px solid rgba(27,42,74,.18)', color: '#1B2A4A', font: "700 13.5px 'Nunito Sans'", marginTop: 8 }}>＋ Nuovo torneo</div>

      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(27,42,74,.09)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div onClick={() => onNavigate('profilo')} style={{ flex: 'none', cursor: 'pointer' }}>
          <Avatar initial={initial} size={32} font={14} uri={session?.avatarUrl} />
        </div>
        <div onClick={() => onNavigate('profilo')} title="Profilo" style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ font: "700 12.5px 'Nunito Sans'", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session?.name}</div>
          </div>
          <div style={{ font: "600 10.5px 'Nunito Sans'", color: 'rgba(27,42,74,.45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session?.role === 'admin' ? 'Admin · ' : ''}{session?.email}</div>
        </div>
        <div className="chip" onClick={logout} title="Esci" style={{ font: "700 11px 'Nunito Sans'", color: 'rgba(27,42,74,.55)', cursor: 'pointer', padding: '4px 6px', flex: 'none' }}>Esci</div>
      </div>
    </aside>
  )
}
