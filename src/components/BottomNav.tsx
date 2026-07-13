import type { Screen } from '../lib/models'
import NavIcon from './NavIcons'

interface NavEntry { key: Screen; label: string }

const NAV: NavEntry[] = [
  { key: 'home', label: 'Home' },
  { key: 'tornei', label: 'Tornei' },
  { key: 'compagni', label: 'Soci' },
  { key: 'diario', label: 'Diario' },
]

function Item({ n, screen, onNavigate }: { n: NavEntry; screen: Screen; onNavigate: (s: Screen) => void }) {
  const col = screen === n.key ? '#1B2A4A' : 'rgba(27,42,74,.4)'
  return (
    <div className="nav" onClick={() => onNavigate(n.key)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: col, cursor: 'pointer' }}>
      <NavIcon screen={n.key} size={22} />
      <span style={{ font: "700 10px 'Nunito Sans'" }}>{n.label}</span>
    </div>
  )
}

interface BottomNavProps {
  screen: Screen
  onNavigate: (screen: Screen) => void
  fabOpen: boolean
  onToggleFab: () => void
  onNewTorneo: () => void
  onNewPartita: () => void
  onAssistant: () => void
  canAssistant: boolean
}

export default function BottomNav({ screen, onNavigate, fabOpen, onToggleFab, onNewTorneo, onNewPartita, onAssistant, canAssistant }: BottomNavProps) {
  return (
    <>
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, height: 70, background: '#fff', borderTop: '1px solid rgba(27,42,74,.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 8px 10px', zIndex: 40 }}>
        <Item n={NAV[0]} screen={screen} onNavigate={onNavigate} />
        <Item n={NAV[1]} screen={screen} onNavigate={onNavigate} />
        <div style={{ width: 56 }} />
        <Item n={NAV[2]} screen={screen} onNavigate={onNavigate} />
        <Item n={NAV[3]} screen={screen} onNavigate={onNavigate} />
      </div>

      <div className="chip" onClick={onToggleFab} style={{ position: 'fixed', left: '50%', bottom: 40, transform: 'translateX(-50%)', width: 54, height: 54, borderRadius: '50%', background: '#FF6B35', boxShadow: '0 8px 20px -6px rgba(255,107,53,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: "300 30px 'Space Grotesk'", color: '#fff', zIndex: 41, cursor: 'pointer' }}>＋</div>

      {fabOpen && (
        <div onClick={onToggleFab} style={{ position: 'fixed', inset: 0, zIndex: 42, animation: 'overlay .2s ease' }}>
          <div style={{ position: 'absolute', left: '50%', bottom: 112, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <div className="chip" onClick={onAssistant} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'linear-gradient(135deg,#FF6B35,#FF9558)', color: '#fff', font: "700 13.5px 'Nunito Sans'", padding: '12px 20px', borderRadius: 12, boxShadow: '0 8px 22px -8px rgba(255,107,53,.7)', cursor: 'pointer' }}>
              ✨ Crea con l’assistente
              {!canAssistant && <span style={{ font: "800 8px 'Nunito Sans'", letterSpacing: '.4px', textTransform: 'uppercase', padding: '2px 5px', borderRadius: 4, background: 'rgba(255,255,255,.28)', color: '#fff' }}>Premium</span>}
            </div>
            <div className="chip" onClick={onNewTorneo} style={{ background: '#fff', color: '#1B2A4A', font: "700 13.5px 'Nunito Sans'", padding: '12px 20px', borderRadius: 12, boxShadow: '0 8px 22px -8px rgba(27,42,74,.4)', cursor: 'pointer' }}>Nuovo torneo</div>
            <div className="chip" onClick={onNewPartita} style={{ background: '#1B2A4A', color: '#fff', font: "700 13.5px 'Nunito Sans'", padding: '12px 20px', borderRadius: 12, boxShadow: '0 8px 22px -8px rgba(27,42,74,.4)', cursor: 'pointer' }}>Nuova partita</div>
          </div>
        </div>
      )}
    </>
  )
}
